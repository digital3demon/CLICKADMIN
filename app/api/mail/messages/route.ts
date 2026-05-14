import { NextResponse } from "next/server";
import { mailboxRoleAllowed } from "@/lib/mail-access";
import { getMailApiContext } from "@/lib/mail-api-context";

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId, role } = r.ctx;
  const url = new URL(req.url);
  const mailboxId = url.searchParams.get("mailboxId")?.trim();
  if (!mailboxId) return NextResponse.json({ error: "mailboxId обязателен" }, { status: 400 });
  const mailbox = await db.mailMailbox.findFirst({ where: { id: mailboxId, tenantId } });
  if (!mailbox) return NextResponse.json({ error: "Ящик не найден" }, { status: 404 });
  if (!mailboxRoleAllowed(mailbox, role)) {
    return NextResponse.json({ error: "Нет доступа к ящику" }, { status: 403 });
  }
  const folder = url.searchParams.get("folder")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim();
  const messages = await db.mailMessage.findMany({
    where: {
      tenantId,
      mailboxId,
      ...(folder ? { folder } : {}),
      ...(q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { fromText: { contains: q, mode: "insensitive" } },
              { toText: { contains: q, mode: "insensitive" } },
              { preview: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ receivedAt: "desc" }, { sentAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      folder: true,
      direction: true,
      readState: true,
      fromText: true,
      toText: true,
      subject: true,
      preview: true,
      labels: true,
      assignedUserId: true,
      isImportant: true,
      crmFolder: true,
      receivedAt: true,
      sentAt: true,
      createdAt: true,
      _count: { select: { attachments: true, links: true } },
    },
  });
  return NextResponse.json({ messages });
}
