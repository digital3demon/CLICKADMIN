import type { NextResponse } from "next/server";
import { apiLogger } from "@/lib/server/logger";

type Opts = {
  method: string;
  path: string;
};

/**
 * Логирует длительность обработки API (после ответа).
 * path — логический маршрут, например `/api/orders`.
 */
export function withApiTiming<T extends NextResponse | Response>(
  opts: Opts,
  run: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now();
  return run().then(
    (res) => {
      apiLogger.info({
        msg: "api_request",
        method: opts.method,
        path: opts.path,
        status: res.status,
        ms: Date.now() - t0,
      });
      return res;
    },
    (err: unknown) => {
      apiLogger.error(
        {
          msg: "api_request_error",
          method: opts.method,
          path: opts.path,
          ms: Date.now() - t0,
          err,
        },
        "api handler threw",
      );
      throw err;
    },
  );
}
