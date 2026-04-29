import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitAllow } from "@/lib/server/rate-limit-edge";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DEMO_COOKIE_NAME,
  getAuthSecretKey,
} from "@/lib/auth/jwt";
import {
  canAccessFinancialAnalytics,
  isKanbanOnlyUser,
} from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";
import { isKaitenExternalPath } from "@/lib/commercial-blocked-paths";
import {
  isPortalCrmHost,
  tenantSlugFromHostHeader,
} from "@/lib/tenant-slug";
import { prisma } from "@/lib/prisma";
import {
  canAccessKanban,
  planAllowsCosting,
  planAllowsHistoryAndAnalytics,
  planAllowsInventory,
  planAllowsShipments,
} from "@/lib/plan-entitlements";
import type { SubscriptionPlan } from "@prisma/client";

function securityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  return res;
}

/**
 * Редирект: предпочитаем абсолютный URL с публичным хостом из X-Forwarded-*.
 * Иначе часть прокси переписывает `Location: /login` в `https://localhost:PORT/login`.
 */
function redirectPublic(req: NextRequest, pathWithQuery: string): NextResponse {
  const origin = publicOriginFromHeaders(req.headers);
  if (origin) {
    try {
      const target = new URL(pathWithQuery, origin);
      if (
        pathWithQuery.startsWith("/") &&
        !pathWithQuery.startsWith("//") &&
        target.pathname.startsWith("/")
      ) {
        return securityHeaders(NextResponse.redirect(target, 307));
      }
    } catch {
      /* fall through */
    }
  }
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: pathWithQuery },
  });
  return securityHeaders(res);
}

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return ip;
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/telegram-login")) return true;
  if (pathname.startsWith("/api/auth/activate-invite")) return true;
  if (pathname.startsWith("/api/auth/bootstrap-owner")) return true;
  if (pathname.startsWith("/api/auth/status")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (pathname.startsWith("/api/auth/logout-and-go")) return true;
  if (pathname.startsWith("/api/auth/session")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/demo/start")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

/** Пути, доступные роли «Пользователь» (только канбан + сессия/выход). */
function kanbanOnlyUserMayAccess(pathname: string): boolean {
  if (pathname.startsWith("/kanban")) return true;
  if (pathname.startsWith("/directory/profile")) return true;
  if (pathname.startsWith("/api/kanban/")) return true;
  if (pathname.startsWith("/api/me/profile")) return true;
  if (pathname.startsWith("/api/me/avatar")) return true;
  if (pathname.startsWith("/api/user-avatars/")) return true;
  if (pathname.startsWith("/api/auth/session")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (pathname.startsWith("/api/auth/logout-and-go")) return true;
  if (pathname.startsWith("/api/auth/link-telegram")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  securityHeaders(res);

  const pathname = req.nextUrl.pathname;
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  if (req.nextUrl.pathname.startsWith("/api")) {
    if (process.env.RATE_LIMIT_DISABLED === "1") {
      /* skip */
    } else {
      const key = clientKey(req);
      if (!rateLimitAllow(key)) {
        const limited = NextResponse.json(
          { error: "Слишком много запросов. Подождите минуту." },
          { status: 429 },
        );
        securityHeaders(limited);
        limited.headers.set("Retry-After", "60");
        return limited;
      }
    }
  }

  if (isPortalCrmHost(host) && (pathname === "/" || pathname.startsWith("/api/portal/"))) {
    return res;
  }

  const comm =
    process.env.CRM_BUILD?.trim().toLowerCase() === "commercial" ||
    process.env.CRM_BUILD?.trim().toLowerCase() === "saas";
  if (comm && isKaitenExternalPath(pathname)) {
    const n = NextResponse.json({ error: "Not found" }, { status: 404 });
    return securityHeaders(n);
  }

  /** Cron (Vercel / внешний планировщик): Bearer CRON_SECRET, без сессии. */
  if (pathname.startsWith("/api/cron/")) {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = req.headers.get("authorization")?.trim();
    if (secret && auth === `Bearer ${secret}`) {
      return securityHeaders(NextResponse.next());
    }
    const out = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return securityHeaders(out);
  }

  if (isSingleUserPortable()) {
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      return redirectPublic(req, "/orders");
    }
    if (pathname.startsWith("/directory/users")) {
      return redirectPublic(req, "/directory");
    }
    if (pathname.startsWith("/api/users")) {
      const out = NextResponse.json(
        { error: "В однопользовательской сборке раздел недоступен" },
        { status: 404 },
      );
      return securityHeaders(out);
    }
    if (
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/telegram-login") ||
      pathname.startsWith("/api/auth/activate-invite") ||
      pathname.startsWith("/api/auth/bootstrap-owner")
    ) {
      const out = NextResponse.json(
        { error: "В однопользовательской сборке вход не используется" },
        { status: 403 },
      );
      return securityHeaders(out);
    }
    if (pathname.startsWith("/api/demo")) {
      const out = NextResponse.json(
        { error: "В однопользовательской сборке демо недоступно" },
        { status: 403 },
      );
      return securityHeaders(out);
    }
    return res;
  }

  if (isPublicPath(pathname)) {
    return res;
  }

  const secret = getAuthSecretKey();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Задайте AUTH_SECRET в .env (мин. 16 символов).", {
        status: 500,
      });
    }
    return res;
  }

  const demoToken = req.cookies.get(SESSION_DEMO_COOKIE_NAME)?.value;
  const mainToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session = null as Awaited<ReturnType<typeof verifySessionToken>>;
  if (demoToken) {
    const d = await verifySessionToken(demoToken);
    if (d?.demo) session = d;
  }
  if (!session && mainToken) {
    const m = await verifySessionToken(mainToken);
    if (m && !m.demo) session = m;
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      const out = NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      securityHeaders(out);
      return out;
    }
    const qs = new URLSearchParams({ next: pathname });
    return redirectPublic(req, `/login?${qs.toString()}`);
  }

  const role = session.role as UserRole;

  if (!session.demo && !isSingleUserPortable()) {
    const slug = tenantSlugFromHostHeader(host);
    const tenantRow = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenantRow) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Организация не найдена" },
          { status: 404 },
        );
        return securityHeaders(out);
      }
      return securityHeaders(
        new NextResponse("Организация не найдена", { status: 404 }),
      );
    }
    if (session.tid && session.tid !== tenantRow.id) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Сессия относится к другой организации. Выйдите и войдите на своём поддомене." },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return securityHeaders(
        new NextResponse(
          "Откройте CRM на поддомене своей организации и войдите снова.",
          { status: 403 },
        ),
      );
    }
  }

  const plan: SubscriptionPlan = session.plan ?? "ULTRA";
  const addonK = session.addonKanban === true;

  if (!canAccessKanban(plan, addonK)) {
    if (
      pathname === "/kanban" ||
      pathname.startsWith("/kanban/") ||
      pathname.startsWith("/api/kanban/")
    ) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Канбан не подключён в подписке" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/orders");
    }
  }

  if (!planAllowsShipments(plan)) {
    if (pathname.startsWith("/shipments") || pathname.startsWith("/api/shipments")) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Отгрузки доступны с тарифа «Оптимальный»" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/orders");
    }
  }

  if (!planAllowsHistoryAndAnalytics(plan)) {
    if (
      pathname === "/contractors" ||
      pathname.startsWith("/contractors/") ||
      pathname.startsWith("/api/contractor-revisions")
    ) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "История контрагентов — с тарифа «Оптимальный»" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/orders");
    }
  }

  if (
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname.startsWith("/api/analytics")
  ) {
    if (!canAccessFinancialAnalytics(role)) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Нет доступа к аналитике" },
          { status: 403 },
        );
        securityHeaders(out);
        return out;
      }
      return redirectPublic(req, "/orders");
    }
    if (!planAllowsHistoryAndAnalytics(plan)) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Аналитика — с тарифа «Оптимальный»" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/orders");
    }
  }

  if (!planAllowsCosting(plan)) {
    if (
      pathname.startsWith("/directory/costing") ||
      pathname.startsWith("/api/costing")
    ) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Просчёт работ — в тарифе «Ультра»" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/directory");
    }
  }

  if (!planAllowsInventory(plan)) {
    if (
      pathname.startsWith("/directory/warehouse") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/api/inventory")
    ) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Склад — в тарифе «Ультра»" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/orders");
    }
  }

  if (isKanbanOnlyUser(role) && !kanbanOnlyUserMayAccess(pathname)) {
    if (pathname.startsWith("/api/")) {
      const out = NextResponse.json(
        { error: "Для вашей учётной записи доступна только канбан-доска" },
        { status: 403 },
      );
      securityHeaders(out);
      return out;
    }
    return redirectPublic(req, "/kanban");
  }

  if (pathname.startsWith("/directory/users")) {
    if (role !== "OWNER") {
      return redirectPublic(req, "/directory");
    }
  }

  return res;
}

export const config = {
  /** Node runtime: Edge middleware could verify JWT with empty/wrong AUTH_SECRET if .env appeared only after `next build`. */
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
