/**
 * Подтягивает @napi-rs/canvas в standalone-трейс Next (pdfjs / pdf-parse на сервере).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    await import("@napi-rs/canvas");
  } catch {
    // на нестандартных платформах пакет может отсутствовать
  }
}
