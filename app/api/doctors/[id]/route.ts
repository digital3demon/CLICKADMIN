import type { OrderPriceListKind, Prisma } from "@prisma/client";
import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  DOCTOR_UPDATE_FIELD_LABELS,
  humanizeUpdatedFields,
} from "@/lib/contractor-field-labels";
import {
  buildDoctorDeleteDetails,
  buildDoctorUpdateDetails,
} from "@/lib/contractor-revision-details";
import { getPrisma } from "@/lib/get-prisma";
import { recordContractorRevision } from "@/lib/record-contractor-revision";
import {
  deactivateDoctorIpClinic,
  ensureDoctorIpClinic,
} from "@/lib/doctor-ip-clinic";

const doctorBeforePatchSelect = {
  fullName: true,
  lastName: true,
  firstName: true,
  patronymic: true,
  formerLastName: true,
  specialty: true,
  city: true,
  email: true,
  clinicWorkEmail: true,
  phone: true,
  preferredContact: true,
  telegramUsername: true,
  birthday: true,
  particulars: true,
  acceptsPrivatePractice: true,
  isIpEntrepreneur: true,
  orderPriceListKind: true,
  deletedAt: true,
} as const;

const doctorDeleteSnapshotSelect = {
  fullName: true,
  lastName: true,
  firstName: true,
  patronymic: true,
  formerLastName: true,
  specialty: true,
  city: true,
  email: true,
  clinicWorkEmail: true,
  phone: true,
  preferredContact: true,
  telegramUsername: true,
  birthday: true,
  particulars: true,
  acceptsPrivatePractice: true,
  isIpEntrepreneur: true,
  orderPriceListKind: true,
} as const;

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function parseBirthday(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

type PatchBody = {
  fullName?: string;
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
  formerLastName?: string | null;
  specialty?: string | null;
  city?: string | null;
  email?: string | null;
  clinicWorkEmail?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
  telegramUsername?: string | null;
  birthday?: string | null;
  particulars?: string | null;
  acceptsPrivatePractice?: boolean;
  isIpEntrepreneur?: boolean;
  orderPriceListKind?: OrderPriceListKind | null;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const beforeRow = await prisma.doctor.findUnique({
      where: { id },
      select: doctorBeforePatchSelect,
    });
    if (!beforeRow) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }
    if (beforeRow.deletedAt) {
      return NextResponse.json(
        {
          error:
            "Врач удалён. Восстановите запись в разделе «Клиенты → История и удалённые».",
        },
        { status: 410 },
      );
    }

    const { deletedAt: _delAt, ...beforeScalars } = beforeRow;

    const body = (await req.json()) as PatchBody;
    const data: Prisma.DoctorUpdateInput = {};

    if (body.fullName !== undefined) {
      const fullName = String(body.fullName ?? "").trim();
      if (!fullName) {
        return NextResponse.json(
          { error: "ФИО не может быть пустым" },
          { status: 400 },
        );
      }
      data.fullName = fullName;
    }
    if (body.lastName !== undefined) data.lastName = trimOrNull(body.lastName);
    if (body.firstName !== undefined) data.firstName = trimOrNull(body.firstName);
    if (body.patronymic !== undefined) {
      data.patronymic = trimOrNull(body.patronymic);
    }
    if (body.formerLastName !== undefined) {
      data.formerLastName = trimOrNull(body.formerLastName);
    }
    if (body.specialty !== undefined) data.specialty = trimOrNull(body.specialty);
    if (body.city !== undefined) data.city = trimOrNull(body.city);
    if (body.email !== undefined) data.email = trimOrNull(body.email);
    if (body.clinicWorkEmail !== undefined) {
      data.clinicWorkEmail = trimOrNull(body.clinicWorkEmail);
    }
    if (body.phone !== undefined) data.phone = trimOrNull(body.phone);
    if (body.preferredContact !== undefined) {
      data.preferredContact = trimOrNull(body.preferredContact);
    }
    if (body.telegramUsername !== undefined) {
      const raw = trimOrNull(body.telegramUsername);
      data.telegramUsername =
        raw != null ? raw.replace(/^@+/, "") : null;
    }
    if (body.birthday !== undefined) {
      if (body.birthday === null || body.birthday === "") {
        data.birthday = null;
      } else {
        const d = parseBirthday(body.birthday);
        if (!d) {
          return NextResponse.json(
            { error: "День рождения: ожидается дата ГГГГ-ММ-ДД" },
            { status: 400 },
          );
        }
        data.birthday = d;
      }
    }
    if (body.particulars !== undefined) {
      data.particulars = trimOrNull(body.particulars);
    }
    if (body.acceptsPrivatePractice !== undefined) {
      data.acceptsPrivatePractice = Boolean(body.acceptsPrivatePractice);
    }
    if (body.isIpEntrepreneur !== undefined) {
      const next = Boolean(body.isIpEntrepreneur);
      if (next && !beforeRow.isIpEntrepreneur) {
        await ensureDoctorIpClinic(prisma, id);
      } else if (!next && beforeRow.isIpEntrepreneur) {
        await deactivateDoctorIpClinic(prisma, id);
      }
      data.isIpEntrepreneur = next;
    }
    if (body.orderPriceListKind !== undefined) {
      if (body.orderPriceListKind === null) {
        data.orderPriceListKind = null;
      } else if (
        body.orderPriceListKind === "MAIN" ||
        body.orderPriceListKind === "CUSTOM"
      ) {
        data.orderPriceListKind = body.orderPriceListKind;
      } else {
        return NextResponse.json(
          { error: "Прайс: MAIN, CUSTOM или null" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data,
      select: {
        fullName: true,
        lastName: true,
        firstName: true,
        patronymic: true,
        formerLastName: true,
        specialty: true,
        city: true,
        email: true,
        clinicWorkEmail: true,
        phone: true,
        preferredContact: true,
        telegramUsername: true,
        birthday: true,
        particulars: true,
        acceptsPrivatePractice: true,
        isIpEntrepreneur: true,
        orderPriceListKind: true,
      },
    });

    if (
      (data.fullName !== undefined ||
        data.lastName !== undefined ||
        data.firstName !== undefined ||
        data.patronymic !== undefined) &&
      updated.isIpEntrepreneur
    ) {
      const ipC = await prisma.clinic.findFirst({
        where: { sourceDoctorId: id, deletedAt: null },
        select: { id: true },
      });
      if (ipC) {
        const name = `ИП ${updated.fullName}`.trim().slice(0, 240);
        await prisma.clinic.update({
          where: { id: ipC.id },
          data: { name: name || "ИП (врач)" },
        });
      }
    }

    const patchKeys = Object.keys(data);
    const fields = humanizeUpdatedFields(patchKeys, DOCTOR_UPDATE_FIELD_LABELS);
    const summary = fields
      ? `Врач «${updated.fullName}»: ${fields}`
      : `Врач «${updated.fullName}»: сохранение`;
    const details = buildDoctorUpdateDetails({
      labels: DOCTOR_UPDATE_FIELD_LABELS,
      patchKeys,
      before: beforeScalars as Record<string, unknown>,
      after: updated as Record<string, unknown>,
      headline: `Врач «${updated.fullName}»`,
    });
    await recordContractorRevision(prisma, {
      kind: "UPDATE",
      doctorId: id,
      summary,
      details,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH doctors/[id]]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить" },
      { status: 500 },
    );
  }
}

/** Мягкое удаление врача (восстановление из истории). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const row = await prisma.doctor.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, ...doctorDeleteSnapshotSelect },
    });
    if (!row) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }
    if (row.deletedAt) {
      return NextResponse.json({ error: "Врач уже удалён" }, { status: 400 });
    }

    const { deletedAt: _d, id: _id, ...snap } = row;
    const details = buildDoctorDeleteDetails(snap as Record<string, unknown>);

    await prisma.doctor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.DELETE,
      doctorId: id,
      summary: details.headline,
      details,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/doctors/[id]]", e);
    return NextResponse.json(
      { error: "Не удалось удалить" },
      { status: 500 },
    );
  }
}
