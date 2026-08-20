/**
 * Текст из PDF для счетов/выписок.
 * Next иногда резолвит `pdf-parse` в browser-сборку — тогда getText падает,
 * хотя тот же файл в node читается. Грузим CJS через createRequire.
 * data: Uint8Array (не Buffer). Сначала getText(), потом { first: 5 }.
 */

export async function extractPdfPlainText(
  buf: Buffer,
): Promise<{ text: string; error: string | null }> {
  if (!buf || buf.length < 16) {
    return { text: "", error: "Пустой или слишком короткий файл" };
  }
  if (!buf.subarray(0, 8).toString("latin1").includes("%PDF")) {
    return { text: "", error: "Файл не похож на PDF" };
  }
  const PDF_PARSE_BUDGET_MS = 14_000;
  try {
    const text = await Promise.race([
      readPdfText(buf),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("PDF_PARSE_TIMEOUT")), PDF_PARSE_BUDGET_MS),
      ),
    ]);
    return { text, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[extractPdfPlainText]", msg);
    return {
      text: "",
      error:
        msg === "PDF_PARSE_TIMEOUT"
          ? "Разбор PDF прерван по таймауту"
          : `Не удалось извлечь текст из PDF${msg ? ` (${msg.slice(0, 120)})` : ""}`,
    };
  }
}

async function readPdfText(buf: Buffer): Promise<string> {
  const PDFParse = await loadPdfParseCtor();
  const data = Uint8Array.from(buf);
  const parser = new PDFParse({ data });
  try {
    try {
      const all = await parser.getText();
      const text = String(all?.text ?? "");
      if (text.trim()) return text;
    } catch (e) {
      console.warn("[extractPdfPlainText] getText()", e);
    }
    const partial = await parser.getText({ first: 5 });
    return String(partial?.text ?? "");
  } finally {
    await parser.destroy().catch(() => {});
  }
}

type PdfParseCtor = new (opts: { data: Uint8Array }) => {
  getText: (opts?: { first?: number }) => Promise<{ text?: string }>;
  destroy: () => Promise<void>;
};

async function loadPdfParseCtor(): Promise<PdfParseCtor> {
  const pick = (mod: unknown): PdfParseCtor | undefined => {
    if (!mod || typeof mod !== "object") return undefined;
    const o = mod as {
      PDFParse?: PdfParseCtor;
      default?: { PDFParse?: PdfParseCtor } | PdfParseCtor;
    };
    if (typeof o.PDFParse === "function") return o.PDFParse;
    if (o.default && typeof o.default === "object" && typeof o.default.PDFParse === "function") {
      return o.default.PDFParse;
    }
    if (typeof o.default === "function") return o.default as PdfParseCtor;
    return undefined;
  };

  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(`${process.cwd()}/package.json`);
    const ctor = pick(req("pdf-parse"));
    if (ctor) return ctor;
  } catch {
    /* dynamic import ниже */
  }

  const ctor = pick(await import("pdf-parse"));
  if (typeof ctor !== "function") {
    throw new Error("pdf-parse: нет PDFParse");
  }
  return ctor;
}
