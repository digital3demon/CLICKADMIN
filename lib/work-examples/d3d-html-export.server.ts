/**
 * Exocad → D3D HTML на сервере через d3d-html-export (embed/AGENTS.md).
 * Браузер не парсит Exocad. Таймаут 300 с. Lite CSS после convert.
 */

import "server-only";

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { injectD3dEmbedLiteCss } from "@/lib/work-examples/d3d-embed-lite";
import {
  D3D_HTML_EXPORT_TIMEOUT_MS,
  d3dHtmlConvertUserMessage,
  mapD3dHtmlExportFailure,
  resolveD3dHtmlExportBin,
  type D3dHtmlConvertErrorCode,
} from "@/lib/work-examples/d3d-html-export";
import { workExampleHtmlSceneKind } from "@/lib/work-examples/html-scene-kind";
import { writeWorkExampleFile } from "@/lib/work-examples/storage";

export type D3dHtmlConvertOk = { ok: true; converted: boolean; bytes: Buffer };
export type D3dHtmlConvertFail = {
  ok: false;
  status: 400 | 503 | 504;
  code: D3dHtmlConvertErrorCode;
  error: string;
};
export type D3dHtmlConvertResult = D3dHtmlConvertOk | D3dHtmlConvertFail;

function fail(code: D3dHtmlConvertErrorCode, status: 400 | 503 | 504): D3dHtmlConvertFail {
  return { ok: false, status, code, error: d3dHtmlConvertUserMessage(code) };
}

function runExport(
  bin: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: null, stdout, stderr, timedOut: true });
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut: false });
    });
  });
}

export async function convertHtmlBufferToD3d(
  input: Buffer,
  title: string,
): Promise<D3dHtmlConvertResult> {
  const peek = input.subarray(0, 65_536).toString("utf8");
  const kind = workExampleHtmlSceneKind(peek);
  if (kind === "d3d") {
    const html = injectD3dEmbedLiteCss(input.toString("utf8"));
    return { ok: true, converted: false, bytes: Buffer.from(html, "utf8") };
  }
  if (kind !== "exocad") return fail("not_exocad_or_d3d", 400);

  const bin = resolveD3dHtmlExportBin();
  if (!bin) return fail("bin_missing", 503);

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "d3d-html-"));
  const src = path.join(tmp, "in.html");
  const out = path.join(tmp, "out.html");
  const started = Date.now();
  try {
    await fs.writeFile(src, input);
    const safeTitle = title.replace(/\s+/g, " ").trim().slice(0, 160) || "Сцена";
    const run = await runExport(
      bin,
      ["--from-exocad", src, "--html", out, "--title", safeTitle],
      D3D_HTML_EXPORT_TIMEOUT_MS,
    );
    console.info(
      JSON.stringify({
        evt: "d3d_html_export",
        ms: Date.now() - started,
        code: run.code,
        timedOut: run.timedOut,
        inBytes: input.length,
      }),
    );
    if (run.timedOut) return fail("timeout", 504);
    if (run.code !== 0) {
      const code = mapD3dHtmlExportFailure(`${run.stderr}\n${run.stdout}`, false);
      return fail(code, code === "encrypted_exocad" ? 400 : 400);
    }
    const raw = await fs.readFile(out);
    const html = injectD3dEmbedLiteCss(raw.toString("utf8"));
    if (workExampleHtmlSceneKind(html) !== "d3d") return fail("convert_failed", 400);
    return { ok: true, converted: true, bytes: Buffer.from(html, "utf8") };
  } catch (e) {
    console.info(
      JSON.stringify({
        evt: "d3d_html_export_error",
        ms: Date.now() - started,
        err: e instanceof Error ? e.message : "fail",
      }),
    );
    return fail("convert_failed", 400);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function persistWorkExampleD3dHtml(opts: {
  prisma: {
    workExampleFile: {
      update: (args: {
        where: { id: string };
        data: { sizeBytes: number; mime: string };
      }) => Promise<unknown>;
    };
  };
  exampleId: string;
  fileId: string;
  bytes: Buffer;
}): Promise<void> {
  await writeWorkExampleFile(
    opts.exampleId,
    opts.fileId,
    opts.bytes,
    "text/html; charset=utf-8",
  );
  await opts.prisma.workExampleFile.update({
    where: { id: opts.fileId },
    data: { sizeBytes: opts.bytes.length, mime: "text/html" },
  });
}
