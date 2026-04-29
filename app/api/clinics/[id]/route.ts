import type {
  BillingLegalForm,
  OrderPriceListKind,
  Prisma,
  ReconciliationFrequency,
} from "@prisma/client";
import { ContractorRevisionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  CLINIC_UPDATE_FIELD_LABELS,
  humanizeUpdatedFields,
} from "@/lib/contractor-field-labels";
import {
  buildClinicDeleteDetails,
  buildClinicUpdateDetails,
} from "@/lib/contractor-revision-details";
import { getPrisma } from "@/lib/get-prisma";
import type { ClinicRequisiteKey } from "@/lib/clinic-requisites";
import { CLINIC_REQUISITE_ROWS } from "@/lib/clinic-requisites";
import { recordContractorRevision } from "@/lib/record-contractor-revision";

const clinicBeforePatchSelect = {
  deletedAt: true,
  name: true,
  address: true,
  isActive: true,
  notes: true,
  worksWithReconciliation: true,
  reconciliationFrequency: true,
  contractSigned: true,
  contractNumber: true,
  worksWithEdo: true,
  billingLegalForm: true,
  orderPriceListKind: true,
  legalFullName: true,
  legalAddress: true,
  inn: true,
  kpp: true,
  ogrn: true,
  bankName: true,
  bik: true,
  settlementAccount: true,
  correspondentAccount: true,
  phone: true,
  email: true,
  ceoName: true,
} as const;

type PatchBody = {
  name?: string;
  address?: string | null;
  isActive?: boolean;
  notes?: string | null;
  worksWithReconciliation?: boolean;
  reconciliationFrequency?: ReconciliationFrequency | null;
  contractSigned?: boolean;
  contractNumber?: string | null;
  worksWithEdo?: boolean;
  billingLegalForm?: BillingLegalForm | null;
  orderPriceListKind?: OrderPriceListKind | null;
} & Partial<Record<ClinicRequisiteKey, string | null>>;

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const prisma = await getPrisma();
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const beforeRow = await prisma.clinic.findUnique({
      where: { id },
      select: clinicBeforePatchSelect,
    });
    if (!beforeRow) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }
    if (beforeRow.deletedAt) {
      return NextResponse.json(
        {
          error:
            "Клиника удалена. Восстановите запись в разделе «Клиенты → История и удалённые».",
        },
        { status: 410 },
      );
    }

    const { deletedAt: _delAt, ...beforeScalars } = beforeRow;

    const body = (await req.json()) as PatchBody;
    const data: Prisma.ClinicUpdateInput = {};

    if (body.name !== undefined) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Название не может быть пустым" },
          { status: 400 },
        );
      }
      data.name = name;
    }
    if (body.address !== undefined) {
      data.address = trimOrNull(body.address);
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }
    if (body.notes !== undefined) {
      data.notes = trimOrNull(body.notes);
    }
    if (body.reconciliationFrequency !== undefined) {
      const rf = body.reconciliationFrequency;
      if (rf === null) {
        data.reconciliationFrequency = null;
      } else if (rf === "MONTHLY_1" || rf === "MONTHLY_2") {
        data.reconciliationFrequency = rf;
      } else {
        return NextResponse.json(
          { error: "Периодичность сверки: MONTHLY_1, MONTHLY_2 или null" },
          { status: 400 },
        );
      }
    }
    if (body.worksWithReconciliation !== undefined) {
      data.worksWithReconciliation = Boolean(body.worksWithReconciliation);
      if (!data.worksWithReconciliation) {
        data.reconciliationFrequency = null;
      }
    }
    if (body.contractSigned !== undefined) {
      data.contractSigned = Boolean(body.contractSigned);
    }
    if (body.contractNumber !== undefined) {
      const cn = trimOrNull(body.contractNumber);
      if (cn != null && cn.length > 500) {
        return NextResponse.json(
          { error: "Номер договора не длиннее 500 символов" },
          { status: 400 },
        );
      }
      data.contractNumber = cn;
    }
    if (body.worksWithEdo !== undefined) {
      data.worksWithEdo = Boolean(body.worksWithEdo);
    }
    if (body.billingLegalForm !== undefined) {
      if (body.billingLegalForm === null) {
        data.billingLegalForm = null;
      } else if (
        body.billingLegalForm === "IP" ||
        body.billingLegalForm === "OOO"
      ) {
        data.billingLegalForm = body.billingLegalForm;
      } else {
        return NextResponse.json(
          { error: "Юрлицо: укажите IP, OOO или null" },
          { status: 400 },
        );
      }
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

    for (const { key } of CLINIC_REQUISITE_ROWS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const v = trimOrNull((body as Record<string, unknown>)[key]);
        switch (key) {
          case "legalFullName":
            data.legalFullName = v;
            break;
          case "legalAddress":
            data.legalAddress = v;
            break;
          case "inn":
            data.inn = v;
            break;
          case "kpp":
            data.kpp = v;
            break;
          case "ogrn":
            data.ogrn = v;
            break;
          case "bankName":
            data.bankName = v;
            break;
          case "bik":
            data.bik = v;
            break;
          case "settlementAccount":
            data.settlementAccount = v;
            break;
          case "correspondentAccount":
            data.correspondentAccount = v;
            break;
          case "phone":
            data.phone = v;
            break;
          case "email":
            data.email = v;
            break;
          case "ceoName":
            data.ceoName = v;
            break;
          default: {
            const _exhaustive: never = key;
            void _exhaustive;
          }
        }
      }
    }

    const resolvedWorks =
      data.worksWithReconciliation !== undefined
        ? Boolean(data.worksWithReconciliation)
        : beforeRow.worksWithReconciliation;
    const resolvedFreq =
      data.reconciliationFrequency !== undefined
        ? data.reconciliationFrequency
        : beforeRow.reconciliationFrequency;
    if (resolvedFreq != null && !resolvedWorks) {
      return NextResponse.json(
        {
          error:
            "Периодичность сверки можно задать только при включённой сверке с контрагентом.",
        },
        { status: 400 },
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Нет полей для обновления" },
        { status: 400 },
      );
    }

    const updated = await prisma.clinic.update({
      where: { id },
      data,
    });

    const patchKeys = Object.keys(data);
    const fields = humanizeUpdatedFields(patchKeys, CLINIC_UPDATE_FIELD_LABELS);
    const summary = fields
      ? `Клиника «${updated.name}»: ${fields}`
      : `Клиника «${updated.name}»: сохранение`;
    const labelLine =
      updated.name.split("\n")[0]?.trim() || updated.name || "Клиника";
    const details = buildClinicUpdateDetails({
      labels: CLINIC_UPDATE_FIELD_LABELS,
      patchKeys,
      before: beforeScalars as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      headline: `Клиника «${labelLine}»`,
    });
    await recordContractorRevision(prisma, {
      kind: "UPDATE",
      clinicId: id,
      summary,
      details,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/clinics/[id]]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить" },
      { status: 500 },
    );
  }
}

/** Мягкое удаление клиники (восстановление из истории). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const prisma = await getPrisma();
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const row = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true, ...clinicBeforePatchSelect },
    });
    if (!row) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }
    if (row.deletedAt) {
      return NextResponse.json(
        { error: "Клиника уже удалена" },
        { status: 400 },
      );
    }

    const { deletedAt: _d, id: _id, ...snap } = row;
    const details = buildClinicDeleteDetails(snap as Record<string, unknown>);

    await prisma.clinic.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordContractorRevision(prisma, {
      kind: ContractorRevisionKind.DELETE,
      clinicId: id,
      summary: details.headline,
      details,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/clinics/[id]]", e);
    return NextResponse.json(
      { error: "Не удалось удалить" },
      { status: 500 },
    );
  }
}
