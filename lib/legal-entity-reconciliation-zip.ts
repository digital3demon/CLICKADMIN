import JSZip from "jszip";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import {
  buildClinicReconciliationPdfPayload,
  reconciliationPdfFileNameBase,
} from "@/lib/clinic-reconciliation-pdf-data";
import {
  reconciliationAttachmentDisposition,
  reconciliationFileAsciiStem,
  reconciliationFileStem,
} from "@/lib/clinic-reconciliation-filename";
import { renderClinicReconciliationPdfBuffer } from "@/lib/clinic-reconciliation-pdf-render";
import { buildClinicReconciliationXlsxBuffer } from "@/lib/clinic-reconciliation-xlsx";

export async function buildLegalEntityReconciliationZip(input: {
  clinicIds: string[];
  title: string;
  periodFromStr: string;
  periodToStr: string;
}): Promise<{ bytes: Uint8Array; fileName: string; contentDisposition: string }> {
  const range = parseDateRangeUTC(input.periodFromStr, input.periodToStr);
  if (!range) {
    throw new Error("Некорректный период");
  }
  const payload = await buildClinicReconciliationPdfPayload(
    input.clinicIds,
    range,
  );
  const [pdfBuf, xlsx] = await Promise.all([
    renderClinicReconciliationPdfBuffer(payload),
    buildClinicReconciliationXlsxBuffer(
      input.clinicIds,
      input.title,
      range,
    ),
  ]);
  const base = reconciliationPdfFileNameBase(
    input.title,
    input.periodFromStr,
    input.periodToStr,
  );
  const zip = new JSZip();
  const pdfBytes = pdfBuf instanceof Uint8Array ? pdfBuf : new Uint8Array(pdfBuf);
  const xlsxBytes = new Uint8Array(xlsx.buffer);
  zip.file(`${base}.pdf`, pdfBytes, { binary: true });
  zip.file(`${base}.xlsx`, xlsxBytes, { binary: true });
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const utfName = `${reconciliationFileStem(
    input.title,
    input.periodFromStr,
    input.periodToStr,
  )}.zip`;
  const asciiName = `${reconciliationFileAsciiStem(
    input.periodFromStr,
    input.periodToStr,
  )}.zip`;
  return {
    bytes,
    fileName: utfName,
    contentDisposition: reconciliationAttachmentDisposition(utfName, asciiName),
  };
}
