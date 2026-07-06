import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

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
          }
        },
        email: {
          select: {
            subject: true,
            textBody: true,
            preview: true,
          }
        }
      }
    });

    let jsonl = "";
    for (const link of links) {
      const textBody = link.email?.textBody || link.email?.preview || "";
      if (!textBody.trim()) continue;

      const prompt = `Ты — профессиональный ассистент зуботехнической лаборатории. Твоя задача — извлечь данные для нового наряда из текста письма от стоматологической клиники.

Тема письма: ${link.email?.subject || "(без темы)"}
Текст письма:
${textBody}

Извлеки следующие поля и верни их СТРОГО в формате JSON:
- patientName: ФИО пациента (строка или null)
- clinicId: ID клиники из справочника (строка или null)
- doctorId: ID врача из справочника (строка или null)
- workDescription: Описание работы (строка или null). Собери сюда все конструкции, цвет, сроки сдачи и особые пожелания.
- urgent: true, если есть пометка о срочности (срочно, cito, asap), иначе false (boolean или null)
- warnings: массив строк с предупреждениями (например, если в письме два разных пациента, или текст слишком короткий/непонятный).`;

      const completion = {
        patientName: link.order?.patientName,
        clinicId: link.order?.clinicId || null,
        doctorId: link.order?.doctorId || null,
        workDescription: link.order?.clientOrderText,
        urgent: link.order?.isUrgent,
        warnings: [],
      };

      const row = {
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: JSON.stringify(completion) }
        ]
      };

      jsonl += JSON.stringify(row) + "\n";
    }

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": 'attachment; filename="ai-dataset.jsonl"',
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
