import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getActivePriceListId } from "@/lib/price-list-workspace";

type TargetType = "CLINIC" | "DOCTOR" | "DOCTOR_CLINIC";

type OverridePatchBody = {
  targetType?: TargetType;
  clinicId?: string | null;
  doctorId?: string | null;
  overrides?: Array<{
    priceListItemId?: string;
    priceRub?: number | null;
  }>;
};

function parseTargetType(v: unknown): TargetType | null {
  const s = String(v ?? "").trim();
  if (s === "CLINIC" || s === "DOCTOR" || s === "DOCTOR_CLINIC") return s;
  return null;
}

function normalizeRub(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

async function assertTargetBelongsTenant(input: {
  tenantId: string;
  clinicId: string | null;
  doctorId: string | null;
}) {
  const prisma = await getPrisma();
  const [clinicOk, doctorOk] = await Promise.all([
    input.clinicId
      ? prisma.clinic.findFirst({
          where: { id: input.clinicId, tenantId: input.tenantId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.doctorId
      ? prisma.doctor.findFirst({
          where: { id: input.doctorId, tenantId: input.tenantId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (input.clinicId && !clinicOk) return { ok: false as const, error: "Клиника не найдена" };
  if (input.doctorId && !doctorOk) return { ok: false as const, error: "Доктор не найден" };
  return { ok: true as const };
}

function requireTargetIds(targetType: TargetType, ids: { clinicId: string | null; doctorId: string | null }) {
  if (targetType === "CLINIC" && !ids.clinicId) return "Выберите клинику";
  if (targetType === "DOCTOR" && !ids.doctorId) return "Выберите доктора";
  if (targetType === "DOCTOR_CLINIC" && (!ids.clinicId || !ids.doctorId)) {
    return "Выберите клинику и доктора";
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    const tenantId = await requireSessionTenantId(s);
    const pricingPrisma = getPricingPrismaClient();
    const url = new URL(req.url);
    const targetType = parseTargetType(url.searchParams.get("targetType"));
    if (!targetType) {
      return NextResponse.json(
        { error: "Укажите targetType: CLINIC | DOCTOR | DOCTOR_CLINIC" },
        { status: 400 },
      );
    }
    const clinicId = (url.searchParams.get("clinicId") ?? "").trim() || null;
    const doctorId = (url.searchParams.get("doctorId") ?? "").trim() || null;
    const idErr = requireTargetIds(targetType, { clinicId, doctorId });
    if (idErr) return NextResponse.json({ error: idErr }, { status: 400 });

    const targetCheck = await assertTargetBelongsTenant({ tenantId, clinicId, doctorId });
    if (!targetCheck.ok) return NextResponse.json({ error: targetCheck.error }, { status: 404 });

    const activePriceListId = await getActivePriceListId(pricingPrisma);
    const rows =
      targetType === "CLINIC"
        ? await pricingPrisma.clinicPriceOverride.findMany({
            where: {
              clinicId: clinicId!,
              priceListItem: { priceListId: activePriceListId, isActive: true },
            },
            select: { priceListItemId: true, priceRub: true },
          })
        : targetType === "DOCTOR"
          ? await pricingPrisma.doctorPriceOverride.findMany({
              where: {
                doctorId: doctorId!,
                priceListItem: { priceListId: activePriceListId, isActive: true },
              },
              select: { priceListItemId: true, priceRub: true },
            })
          : await pricingPrisma.doctorClinicPriceOverride.findMany({
              where: {
                doctorId: doctorId!,
                clinicId: clinicId!,
                priceListItem: { priceListId: activePriceListId, isActive: true },
              },
              select: { priceListItemId: true, priceRub: true },
            });

    return NextResponse.json({ overrides: rows });
  } catch (e) {
    console.error("[GET /api/price-overrides]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить индивидуальные цены" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    const tenantId = await requireSessionTenantId(s);
    const clientsPrisma = await getPrisma();
    const pricingPrisma = getPricingPrismaClient();

    const body = (await req.json().catch(() => ({}))) as OverridePatchBody;
    const targetType = parseTargetType(body.targetType);
    if (!targetType) {
      return NextResponse.json(
        { error: "Укажите targetType: CLINIC | DOCTOR | DOCTOR_CLINIC" },
        { status: 400 },
      );
    }
    const clinicId = String(body.clinicId ?? "").trim() || null;
    const doctorId = String(body.doctorId ?? "").trim() || null;
    const idErr = requireTargetIds(targetType, { clinicId, doctorId });
    if (idErr) return NextResponse.json({ error: idErr }, { status: 400 });

    const targetCheck = await assertTargetBelongsTenant({ tenantId, clinicId, doctorId });
    if (!targetCheck.ok) return NextResponse.json({ error: targetCheck.error }, { status: 404 });

    const raw = Array.isArray(body.overrides) ? body.overrides : [];
    const normalized = raw
      .map((r) => {
        const priceListItemId = String(r?.priceListItemId ?? "").trim();
        if (!priceListItemId) return null;
        const priceRub = normalizeRub(r?.priceRub);
        return { priceListItemId, priceRub };
      })
      .filter((x): x is { priceListItemId: string; priceRub: number | null } => x != null);

    const activePriceListId = await getActivePriceListId(pricingPrisma);
    const uniqIds = [...new Set(normalized.map((x) => x.priceListItemId))];
    if (uniqIds.length > 0) {
      const items = await pricingPrisma.priceListItem.findMany({
        where: {
          id: { in: uniqIds },
          priceListId: activePriceListId,
          isActive: true,
        },
        select: { id: true },
      });
      if (items.length !== uniqIds.length) {
        return NextResponse.json(
          { error: "Некоторые позиции не относятся к активному прайсу" },
          { status: 400 },
        );
      }
    }

    const toUpsert = normalized.filter((x) => x.priceRub != null) as Array<{
      priceListItemId: string;
      priceRub: number;
    }>;
    const keepIds = toUpsert.map((x) => x.priceListItemId);

    await pricingPrisma.$transaction(async (tx) => {
      if (targetType === "CLINIC") {
        await tx.clinicPriceOverride.deleteMany({
          where: {
            clinicId: clinicId!,
            priceListItem: { priceListId: activePriceListId },
            ...(keepIds.length > 0 ? { NOT: { priceListItemId: { in: keepIds } } } : {}),
          },
        });
        for (const row of toUpsert) {
          await tx.clinicPriceOverride.upsert({
            where: {
              clinicId_priceListItemId: {
                clinicId: clinicId!,
                priceListItemId: row.priceListItemId,
              },
            },
            create: { clinicId: clinicId!, priceListItemId: row.priceListItemId, priceRub: row.priceRub },
            update: { priceRub: row.priceRub },
          });
        }
        return;
      }
      if (targetType === "DOCTOR") {
        await tx.doctorPriceOverride.deleteMany({
          where: {
            doctorId: doctorId!,
            priceListItem: { priceListId: activePriceListId },
            ...(keepIds.length > 0 ? { NOT: { priceListItemId: { in: keepIds } } } : {}),
          },
        });
        for (const row of toUpsert) {
          await tx.doctorPriceOverride.upsert({
            where: {
              doctorId_priceListItemId: {
                doctorId: doctorId!,
                priceListItemId: row.priceListItemId,
              },
            },
            create: { doctorId: doctorId!, priceListItemId: row.priceListItemId, priceRub: row.priceRub },
            update: { priceRub: row.priceRub },
          });
        }
        return;
      }
      await tx.doctorClinicPriceOverride.deleteMany({
        where: {
          doctorId: doctorId!,
          clinicId: clinicId!,
          priceListItem: { priceListId: activePriceListId },
          ...(keepIds.length > 0 ? { NOT: { priceListItemId: { in: keepIds } } } : {}),
        },
      });
      for (const row of toUpsert) {
        await tx.doctorClinicPriceOverride.upsert({
          where: {
            doctorId_clinicId_priceListItemId: {
              doctorId: doctorId!,
              clinicId: clinicId!,
              priceListItemId: row.priceListItemId,
            },
          },
          create: {
            doctorId: doctorId!,
            clinicId: clinicId!,
            priceListItemId: row.priceListItemId,
            priceRub: row.priceRub,
          },
          update: { priceRub: row.priceRub },
        });
      }
    });

    // Маркер CUSTOM для плашки "Прайс" в UI карточек контрагентов.
    if (targetType === "CLINIC" && clinicId) {
      await clientsPrisma.clinic.update({
        where: { id: clinicId },
        data: { orderPriceListKind: toUpsert.length > 0 ? "CUSTOM" : null },
      });
    }
    if (targetType === "DOCTOR" && doctorId) {
      await clientsPrisma.doctor.update({
        where: { id: doctorId },
        data: { orderPriceListKind: toUpsert.length > 0 ? "CUSTOM" : null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/price-overrides]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить индивидуальные цены" },
      { status: 500 },
    );
  }
}
