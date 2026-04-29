import type { PrismaClient } from "@prisma/client";

/**
 * Клиника в наряде явно не выбрана (частная практика), но в поле «Юр. лицо» — «ИП»:
 * привязываем к активной клинике-зеркалу врача-ИП (`Clinic.sourceDoctorId`).
 */
export async function resolveClinicIdForDoctorIpOrder(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    doctorId: string;
    /** null — в форме «без клиники»; иначе явный id */
    requestedClinicId: string | null;
    /** Нормализованное поле `Order.legalEntity` (после trim и пусто → null) */
    legalEntity: string | null;
  },
): Promise<
  { ok: true; clinicId: string | null } | { ok: false; error: string }
> {
  if (opts.requestedClinicId) {
    return { ok: true, clinicId: opts.requestedClinicId };
  }
  if (opts.legalEntity === "ИП") {
    const c = await prisma.clinic.findFirst({
      where: {
        tenantId: opts.tenantId,
        sourceDoctorId: opts.doctorId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!c) {
      return {
        ok: false,
        error:
          "Для заказа от ИП в карточке врача включите «Доктор ведёт деятельность как ИП» (появится клиника в справочнике).",
      };
    }
    return { ok: true, clinicId: c.id };
  }
  return { ok: true, clinicId: null };
}
