import type { ContractorRevisionKind, Prisma, PrismaClient } from "@prisma/client";
import { getActorForRevision } from "@/lib/actor-from-session";
import type { ContractorRevisionDetailsV1 } from "@/lib/contractor-revision-details";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Ровно одно из clinicId / doctorId. Для «клиника + врач при создании» пишем строку с clinicId.
 */
export async function recordContractorRevision(
  db: Db,
  input: {
    kind: ContractorRevisionKind;
    summary: string;
    clinicId?: string | null;
    doctorId?: string | null;
    actorLabel?: string;
    /** Структурированное описание для журнала (до/после, снимок до удаления) */
    details?: ContractorRevisionDetailsV1 | null;
  },
): Promise<void> {
  const c = input.clinicId ?? null;
  const d = input.doctorId ?? null;
  const hasC = c != null && c.length > 0;
  const hasD = d != null && d.length > 0;
  if (hasC === hasD) {
    console.error(
      "[recordContractorRevision] нужно указать ровно одно: clinicId или doctorId",
    );
    return;
  }
  let actorLabel = input.actorLabel;
  let actorUserId: string | null = null;
  if (actorLabel === undefined) {
    const a = await getActorForRevision();
    actorLabel = a.label;
    actorUserId = a.userId;
  }
  await db.contractorRevision.create({
    data: {
      actorLabel,
      actorUserId,
      kind: input.kind,
      summary: input.summary,
      details:
        input.details == null
          ? undefined
          : (JSON.parse(
              JSON.stringify(input.details),
            ) as Prisma.InputJsonValue),
      clinicId: hasC ? c : null,
      doctorId: hasD ? d : null,
    },
  });
}
