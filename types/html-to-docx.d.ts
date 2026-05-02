declare module "html-to-docx" {
  /** Пакет без @types; подпись соответствует вызову в lib/clinic-contract.ts */
  function HTMLtoDOCX(
    html: string,
    headerHTMLString: string | null,
    documentOptions?: Record<string, unknown>,
  ): Promise<Buffer | Uint8Array | ArrayBuffer>;
  export default HTMLtoDOCX;
}
