/**
 * Подтягивает canvas и pdfjs worker в standalone-трейс Next
 * (pdf-parse / getText на сервере).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startCrmDailyBackupInProcess } = await import(
      "@/lib/crm-backup/start-process-scheduler"
    );
    startCrmDailyBackupInProcess();
  } catch (e) {
    console.error("[cron] crm-backup scheduler failed to start", e);
  }
  try {
    await import("@napi-rs/canvas");
  } catch {
    // на нестандартных платформах пакет может отсутствовать
  }
  try {
    await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    /* pdfjs может быть только транзитивно через pdf-parse */
  }
}
