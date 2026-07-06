import { NextResponse } from "next/server";

import { getOrdersPrisma } from "@/lib/get-domain-prisma";

import { getSessionFromCookies } from "@/lib/auth/session-server";

import { orderTenantIdForSession } from "@/lib/order-tenant-access";

import { fetchOrderEditInitial } from "@/lib/order-edit-initial-fetcher";

import {

  buildVirtualOrderEditInitialFromPrediction,

  ensurePredictionEnriched,

  resolveClientIdsFromPrediction,

  resolveSuggestedAttachments,

  collectAttachmentsFromSourceEmails,

  type AiPredictionJson,

} from "@/lib/ai-order-draft-from-prediction";

import { resolveClientIdsFromOrderSourceEmail } from "@/lib/client-order-source-emails";

import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";

import { getPrisma } from "@/lib/get-prisma";

import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";

import { getLabDueSettingsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";



export async function GET(

  _req: Request,

  ctx: { params: Promise<{ id: string }> },

) {

  try {

    const s = await getSessionFromCookies();

    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



    const tenantId = await orderTenantIdForSession(s);

    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });



    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    }



    const { id: predictionId } = await ctx.params;

    const db = await getOrdersPrisma();



    const prediction = await db.aiOrderPrediction.findFirst({

      where: { id: predictionId, tenantId },

      select: {

        id: true,

        orderId: true,

        emailId: true,

        predictionJson: true,

        error: true,

      },

    });



    if (!prediction) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    const fetched = await fetchOrderEditInitial(tenantId, prediction.orderId, s);

    if (!fetched) {

      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    }



    if (fetched.archivedAt) {

      return NextResponse.json({ error: "Order archived" }, { status: 409 });

    }



    const orderSourceEmails = await fetchOrderSourceEmails(

      db,

      tenantId,

      prediction.orderId,

    );

    const allAttachments = collectAttachmentsFromSourceEmails(orderSourceEmails);



    const email = await db.email.findUnique({

      where: { id: prediction.emailId },

      select: { fromAddress: true },

    });



    const predictionJson = await ensurePredictionEnriched(db, tenantId, {

      predictionId: prediction.id,

      orderId: prediction.orderId,

      emailId: prediction.emailId,

      predictionJson: (prediction.predictionJson ?? {}) as AiPredictionJson,

      persist: true,

    });



    const sourceMatch = email

      ? await resolveClientIdsFromOrderSourceEmail(db, tenantId, email.fromAddress)

      : { clinicId: null, doctorId: null, matched: false, ambiguous: false };



    const effectiveSourceMatch = predictionJson.matchedBySourceEmail

      ? {

          clinicId: predictionJson.clinicId ?? null,

          doctorId: predictionJson.doctorId ?? null,

          matched: true,

        }

      : sourceMatch.matched

        ? sourceMatch

        : undefined;



    const resolvedIds = resolveClientIdsFromPrediction(

      predictionJson,

      effectiveSourceMatch,

    );



    const { slots: labDueHmSlots, country: productionCalendarCountry } =

      await getLabDueSettingsForTenant(tenantId);



    const aiOrderInitial = buildVirtualOrderEditInitialFromPrediction(

      predictionJson,

      resolvedIds,

      {

        predictionId: prediction.id,

        labDueHmSlots,

        productionCalendarCountry,

      },

    );

    const aiSuggestedAttachments = resolveSuggestedAttachments(

      allAttachments,

      predictionJson.suggestedAttachmentIds,

    );



    let kaitenIntegrationActive = true;

    try {

      const prisma = await getPrisma();

      const integration = await loadKaitenIntegrationTenantState(prisma, tenantId);

      kaitenIntegrationActive = integration.active;

    } catch {

      kaitenIntegrationActive = true;

    }



    return NextResponse.json({

      realOrderInitial: fetched.initial,

      aiOrderInitial,

      aiSuggestedAttachments,

      matchedBySourceEmail: Boolean(predictionJson.matchedBySourceEmail),

      sourceEmailAmbiguous: Boolean(predictionJson.sourceEmailAmbiguous),

      orderNumber: fetched.orderNumber,

      predictionError: prediction.error,

      isDemoMode: Boolean(s.demo),

      kaitenIntegrationActive,

      kanbanCardUrl: fetched.kanbanAbs,

      demoKanbanCardTypes: fetched.demoKanbanCardTypes,

      orderSourceEmails,

      aiEmailId: prediction.emailId,

    });

  } catch (e: any) {

    return NextResponse.json({ error: e.message }, { status: 500 });

  }

}


