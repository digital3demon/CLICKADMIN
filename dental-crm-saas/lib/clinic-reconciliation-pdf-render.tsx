import { renderToBuffer } from "@react-pdf/renderer";
import type { ClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";
import { ClinicReconciliationPdfDocument } from "@/lib/clinic-reconciliation-pdf-document";

export async function renderClinicReconciliationPdfBuffer(
  payload: ClinicReconciliationPdfPayload,
): Promise<Buffer> {
  const buf = await renderToBuffer(
    <ClinicReconciliationPdfDocument payload={payload} />,
  );
  return Buffer.from(buf);
}
