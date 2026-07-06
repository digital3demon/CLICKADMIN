import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";

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

    const links = await db.emailSourceOrder.findMany({
      where: { tenantId },
      include: {
        order: {
          select: {
            patientName: true,
            clinicId: true,
            doctorId: true,
            clientOrderText: true,
            isUrgent: true,
          },
        },
        email: {
          select: {
            subject: true,
            textBody: true,
            preview: true,
            fromAddress: true,
            attachments: {
              select: { id: true, fileName: true, mimeType: true, size: true },
            },
          },
        },
      },
    });

    let jsonl = "";
    for (const link of links) {
      const textBody = link.email?.textBody || link.email?.preview || "";
      if (!textBody.trim()) continue;

      const attachments = link.email?.attachments ?? [];
      const attachmentLines =
        attachments.length === 0
          ? "Вложений в письме нет."
          : attachments
              .map(
                (a) =>
                  `  "${a.id}": ${a.fileName} (${a.mimeType}${a.size != null ? `, ${a.size} B` : ""})`,
              )
              .join(",\n");

      const fromLine = link.email?.fromAddress?.trim()
        ? `Отправитель письма: ${link.email.fromAddress.trim()}`
        : "Отправитель письма: не указан";

      const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
        db,
        tenantId,
        link.email?.fromAddress,
      );
      const groundClinicId = link.order?.clinicId ?? null;
      const groundDoctorId = link.order?.doctorId ?? null;

      const prompt = `Ты — профессиональный ассистент зуботехнической лаборатории. Твоя задача — извлечь данные для нового наряда из текста письма от стоматологической клиники.

${fromLine}

Тема письма: ${link.email?.subject || "(без темы)"}
Текст письма:
${textBody}

Вложения письма (ID -> файл):
{
${attachmentLines}
}

Извлеки следующие поля и верни их СТРОГО в формате JSON:
- patientName: ФИО пациента (строка или null)
- clinicId: ID клиники из справочника (строка или null)
- doctorId: ID врача из справочника (строка или null)
- workDescription: Описание работы (строка или null). Собери сюда все конструкции, цвет, сроки сдачи и особые пожелания.
- urgent: true, если есть пометка о срочности (срочно, cito, asap), иначе false (boolean или null)
- suggestedAttachmentIds: массив ID вложений из каталога выше, которые нужно прикрепить к наряду
- warnings: массив строк с предупреждениями (например, если в письме два разных пациента, или текст слишком короткий/непонятный).`;

      const completion = {
        patientName: link.order?.patientName,
        clinicId: groundClinicId,
        doctorId: groundDoctorId,
        workDescription: link.order?.clientOrderText,
        urgent: link.order?.isUrgent,
        suggestedAttachmentIds: attachments.map((a) => a.id),
        matchedBySourceEmail: sourceMatch.matched,
        sourceEmailAmbiguous: sourceMatch.ambiguous,
        warnings: [],
      };

      const row = {
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: JSON.stringify(completion) },
        ],
      };

      jsonl += JSON.stringify(row) + "\n";
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
