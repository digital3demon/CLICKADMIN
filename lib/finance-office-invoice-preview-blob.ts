import JSZip from "jszip";

function basenamePath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i >= 0 ? norm.slice(i + 1) : norm;
}

/** PDF для модалки «Открыть счёт»: сам файл или PDF из ZIP на клиенте. */
export async function blobForFinanceInvoicePreviewRow(
  row: { fileName: string; sourceArchive: string | null },
  files: readonly File[],
): Promise<Blob | null> {
  if (!row.sourceArchive) {
    const f = files.find((x) => x.name === row.fileName);
    return f ?? null;
  }
  const archive = files.find((x) => x.name === row.sourceArchive);
  if (!archive) return null;
  try {
    const zip = await JSZip.loadAsync(await archive.arrayBuffer());
    const entry = Object.values(zip.files).find((e) => {
      if (e.dir) return false;
      return basenamePath(e.name) === row.fileName;
    });
    if (!entry) return null;
    // arraybuffer, not uint8array: DOM BlobPart rejects Uint8Array<ArrayBufferLike>
    // (Node 22 / TS 5.7+ — buffer may be SharedArrayBuffer).
    const ab = await entry.async("arraybuffer");
    return new Blob([ab], { type: "application/pdf" });
  } catch {
    return null;
  }
}
