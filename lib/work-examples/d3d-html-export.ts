/**
 * Контракт CLI d3d-html-export (3d viever/embed/AGENTS.md).
 * Браузер Exocad не парсит. Маркеры — подстроки, не `\b`.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { D3D_HTML_EXPORT_TIMEOUT_MS } from "@/lib/work-examples/constants";

export { D3D_HTML_EXPORT_TIMEOUT_MS };

export type D3dHtmlConvertErrorCode =
  | "encrypted_exocad"
  | "not_exocad_or_d3d"
  | "convert_failed"
  | "timeout"
  | "bin_missing";

export function d3dHtmlConvertUserMessage(code: D3dHtmlConvertErrorCode): string {
  if (code === "encrypted_exocad") return "зашифрованный Exocad HTML не поддерживается";
  if (code === "not_exocad_or_d3d") return "файл не D3D и не Exocad HTML";
  if (code === "timeout") return "конвертация заняла слишком много времени";
  if (code === "bin_missing") return "на сервере нет d3d-html-export";
  return "не удалось сконвертировать HTML в D3D";
}

export function d3dHtmlExportCandidateBins(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string[] {
  const exe = process.platform === "win32" ? "d3d-html-export.exe" : "d3d-html-export";
  const fromEnv = env.D3D_HTML_EXPORT_BIN?.trim();
  return [
    ...(fromEnv ? [fromEnv] : []),
    path.join(cwd, "tools", exe),
    path.join(cwd, "..", "3d viever", "src-tauri", "target", "release", exe),
    path.join(cwd, "..", "3d viever", "src-tauri", "target", "debug", exe),
  ];
}

/** Env — как задали; иначе первый существующий кандидат. */
export function resolveD3dHtmlExportBin(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string | null {
  const fromEnv = env.D3D_HTML_EXPORT_BIN?.trim();
  if (fromEnv) return fromEnv;
  for (const candidate of d3dHtmlExportCandidateBins(env, cwd)) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function mapD3dHtmlExportFailure(stderr: string, timedOut: boolean): D3dHtmlConvertErrorCode {
  if (timedOut) return "timeout";
  const text = String(stderr || "").toLowerCase();
  // CLI: "encrypted exocad HTML scene is not supported"
  if (text.includes("encrypt") || text.includes("шифр")) return "encrypted_exocad";
  return "convert_failed";
}
