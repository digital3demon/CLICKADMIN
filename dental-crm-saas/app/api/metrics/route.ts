import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function promLine(name: string, help: string, type: string, value: number) {
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name} ${value}\n`;
}

/**
 * Минимальный Prometheus-текст. В проде защитите `METRICS_SECRET`:
 * заголовок `x-metrics-key: <secret>`. Без секрета в production — 404.
 */
export async function GET(req: Request) {
  const secret = process.env.METRICS_SECRET?.trim();
  if (secret) {
    if (req.headers.get("x-metrics-key") !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const m = process.memoryUsage();
  const lines = [
    promLine(
      "process_uptime_seconds",
      "Process uptime in seconds",
      "gauge",
      process.uptime(),
    ),
    promLine(
      "nodejs_heap_used_bytes",
      "V8 heap used",
      "gauge",
      m.heapUsed,
    ),
    promLine(
      "nodejs_heap_total_bytes",
      "V8 heap total",
      "gauge",
      m.heapTotal,
    ),
    promLine(
      "nodejs_rss_bytes",
      "Resident set size",
      "gauge",
      m.rss,
    ),
  ].join("");

  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8; version=0.0.4",
    },
  });
}
