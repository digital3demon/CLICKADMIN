import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canUseAiOrderMode } from "@/lib/auth/permissions";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  buildVirtualOrderDraftFromPrediction,
  resolveClientIdsFromPrediction,
  type AiPredictionJson,
} from "@/lib/ai-order-draft-from-prediction";
import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";
import { runOrderEmailPrediction } from "@/lib/llm/run-order-email-prediction";
import { withApiTiming } from "@/lib/server/api-timing";

type Body = {
  emailId?: string;
};

/** POST — предзаполнение черновика наряда из письма через ИИ (без создания Order). */
export async function POST(req: Request) {
  return withApiTiming(
    { method: "POST", path: "/api/orders/ai-prefill" },
    async () => {
      const session = await getSessionFromCookies();
      if (!session) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const tenantId = await requireSessionTenantId(session);
      const moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
      if (
        session.role !== "OWNER" &&
        !canUseAiOrderMode(session.role, moduleAccess)
      ) {
        return NextResponse.json({ error: "Нет доступа к ИИ-Режиму" }, { status: 403 });
      }

      const db = await getOrdersPrisma();

      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { aiEnabled: true, aiApiKey: true },
      });
      if (!tenant?.aiEnabled || !tenant.aiApiKey) {
        return NextResponse.json(
          { error: "ИИ не настроен. Включите в ИИ-Админ → Настройки." },
          { status: 400 },
        );
      }

      let body: Body;
      try {
        body = (await req.json()) as Body;
      } catch {
        return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
      }

      const emailId = body.emailId?.trim() ?? "";
      if (!emailId) {
        return NextResponse.json({ error: "Укажите emailId" }, { status: 400 });
      }

      const email = await db.email.findFirst({
        where: { id: emailId, tenantId },
        select: { id: true, fromAddress: true },
      });
      if (!email) {
        return NextResponse.json({ error: "Письмо не найдено" }, { status: 404 });
      }

      const run = await runOrderEmailPrediction(db, tenantId, emailId, null);
      if (!run) {
        return NextResponse.json({ error: "Не удалось разобрать письмо" }, { status: 422 });
      }
      if (run.error) {
        return NextResponse.json({ error: run.error }, { status: 422 });
      }

      const predictionJson = run.predictionJson as AiPredictionJson;
      const sourceMatch = await resolveClientIdsFromOrderSourceEmail(
        db,
        tenantId,
        email.fromAddress,
        { preferOrderId: null },
      );
      const effectiveSourceMatch = sourceMatch.matched
        ? sourceMatch
        : predictionJson.matchedBySourceEmail
          ? {
              clinicId: predictionJson.clinicId ?? null,
              doctorId: predictionJson.doctorId ?? null,
              matched: true,
            }
          : undefined;

      const resolvedIds = resolveClientIdsFromPrediction(
        predictionJson,
        effectiveSourceMatch,
      );
      const draft = buildVirtualOrderDraftFromPrediction(predictionJson, resolvedIds);
      const warnings = Array.isArray(predictionJson.warnings)
        ? predictionJson.warnings.filter((w) => typeof w === "string")
        : [];

      return NextResponse.json({
        draft,
        warnings,
        confidenceScore: predictionJson.confidenceScore ?? null,
        model: run.model,
        durationMs: run.durationMs,
      });
    },
  );
}
