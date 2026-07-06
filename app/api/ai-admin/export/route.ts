import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import {
  buildOrderEmailExtractUserPrompt,
  formatAttachmentsForPrompt,
  formatEmailBlocksForPrompt,
  loadClinicDoctorCatalogText,
  type EmailAttachmentCatalogItem,
  type EmailBlockForExtract,
} from "@/lib/llm/order-email-extract";
import {
  compositionHintsFromOrderConstructions,
  emailAttachmentIdsMatchingOrderFiles,
  scanLikeEmailAttachmentIds,
} from "@/lib/llm/order-email-export-ground-truth";
import { fetchClientOrderHistoryContext } from "@/lib/llm/client-history-context";
import { cleanMailTextBody } from "@/lib/mail/mail-text-cleanup";

function emailBodyText(email: {
  textBody: string | null;
  preview: string | null;
}): string {
  return cleanMailTextBody(email.textBody) || cleanMailTextBody(email.preview) || "";
}

function groundTruthSuggestedAttachmentIds(
  order: {
    hasScans: boolean;
    attachments: Array<{ fileName: string; mimeType: string }>;
  },
  emailAttachments: EmailAttachmentCatalogItem[],
): string[] {
  const matched = emailAttachmentIdsMatchingOrderFiles(order.attachments, emailAttachments);
  if (matched.length > 0) return matched;
  if (order.hasScans) return scanLikeEmailAttachmentIds(emailAttachments);
  return [];
}

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getOrdersPrisma();
    const catalogText = await loadClinicDoctorCatalogText(tenantId);

    const links = await db.emailSourceOrder.findMany({
      where: { tenantId },
      include: {
        order: {
        select: {
          id: true,
          createdAt: true,
          patientName: true,
          clinicId: true,
          doctorId: true,
            clientOrderText: true,
            isUrgent: true,
            workReceivedAt: true,
            dueDate: true,
            dueToAdminsAt: true,
            hasScans: true,
            hasCt: true,
            hasMri: true,
            hasPhoto: true,
            legalEntity: true,
            payment: true,
            attachments: {
              select: { fileName: true, mimeType: true },
              where: { scope: "GENERAL" },
            },
            constructions: {
              select: {
                quantity: true,
                teethFdi: true,
                priceListItem: { select: { code: true, name: true } },
              },
            },
          },
        },
        email: {
          select: {
            id: true,
            subject: true,
            textBody: true,
            preview: true,
            fromAddress: true,
            receivedAt: true,
            attachments: {
              select: { id: true, fileName: true, mimeType: true, size: true },
            },
          },
        },
      },
      orderBy: [{ orderId: "asc" }, { createdAt: "asc" }],
    });

    const byOrderId = new Map<string, typeof links>();
    for (const link of links) {
      const list = byOrderId.get(link.orderId) ?? [];
      list.push(link);
      byOrderId.set(link.orderId, list);
    }

    let jsonl = "";
    for (const [, orderLinks] of byOrderId) {
      const order = orderLinks[0]?.order;
      if (!order) continue;

      const attachmentMap = new Map<string, EmailAttachmentCatalogItem>();
      const emailBlocks: EmailBlockForExtract[] = [];
      let primaryEmailId: string | null = null;
      let primaryFromAddress: string | null = null;

      for (const link of orderLinks) {
        const body = emailBodyText(link.email);
        if (!body.trim()) continue;
        if (!primaryEmailId) {
          primaryEmailId = link.email.id;
          primaryFromAddress = link.email.fromAddress;
        }
        emailBlocks.push({
          id: link.email.id,
          subject: link.email.subject,
          textBody: body,
          isPrimary: link.email.id === primaryEmailId,
        });
        for (const a of link.email.attachments) {
          attachmentMap.set(a.id, {
            id: a.id,
            fileName: a.fileName,
            mimeType: a.mimeType,
            size: a.size,
          });
        }
      }

      if (emailBlocks.length === 0) continue;

      const emailAttachments = [...attachmentMap.values()];
      const attachmentsText = formatAttachmentsForPrompt(emailAttachments);
      const emailsText = formatEmailBlocksForPrompt(emailBlocks);

      const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
        db,
        tenantId,
        primaryFromAddress,
        { preferOrderId: order.id },
      );

      const preResolved =
        sourceMatch.matched && sourceMatch.doctorId
          ? { clinicId: sourceMatch.clinicId, doctorId: sourceMatch.doctorId }
          : null;

      const historyContext = await fetchClientOrderHistoryContext(
        db,
        tenantId,
        preResolved?.doctorId ?? null,
        order.patientName,
        order.createdAt,
      );

      const prompt = buildOrderEmailExtractUserPrompt({
        fromAddress: primaryFromAddress,
        catalogText,
        attachmentsText,
        emailsText,
        preResolved,
        historyContext,
      });

      const compositionHints = compositionHintsFromOrderConstructions(order.constructions);
      const suggestedAttachmentIds = groundTruthSuggestedAttachmentIds(order, emailAttachments);

      const completion = {
        patientName: order.patientName ?? null,
        clinicId: order.clinicId ?? null,
        doctorId: order.doctorId ?? null,
        clientOrderText: order.clientOrderText ?? null,
        patientAppointmentAt: order.dueToAdminsAt?.toISOString() ?? null,
        urgent: order.isUrgent ?? null,
        hasScans: order.hasScans ?? null,
        hasCt: order.hasCt ?? null,
        hasMri: order.hasMri ?? null,
        hasPhoto: order.hasPhoto ?? null,
        suggestedAttachmentIds,
        compositionHints,
        confidenceScore: 100,
        matchedBySourceEmail: sourceMatch.matched,
        sourceEmailAmbiguous: sourceMatch.ambiguous,
        warnings: [],
        groundTruth: {
          workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
          dueDate: order.dueDate?.toISOString() ?? null,
          dueToAdminsAt: order.dueToAdminsAt?.toISOString() ?? null,
          legalEntity: order.legalEntity ?? null,
          payment: order.payment ?? null,
          constructions: order.constructions.map((c) => ({
            code: c.priceListItem?.code ?? null,
            name: c.priceListItem?.name ?? null,
            quantity: c.quantity,
            teethFdi: c.teethFdi,
          })),
        },
      };

      jsonl +=
        JSON.stringify({
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: JSON.stringify(completion) },
          ],
        }) + "\n";
    }

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": 'attachment; filename="ai-dataset.jsonl"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
