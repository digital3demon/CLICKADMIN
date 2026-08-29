import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  RATE_LIMIT_AUTH_MAX_PER_WINDOW,
  RATE_LIMIT_IP_MAX_PER_WINDOW,
  rateLimitAllow,
} from "@/lib/server/rate-limit-edge";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DEMO_COOKIE_NAME,
  getAuthSecretKey,
} from "@/lib/auth/jwt";
import {
  getModuleForPathname,
  isKanbanLinkedReadAllowed,
  isOrderAttachmentUploadAllowed,
  requiredModuleForPath,
} from "@/lib/role-module-paths";
import { isOrdersShipmentListPath } from "@/lib/orders-shipment-list-query";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { canOpenMailSettingsModule } from "@/lib/mail/mail-settings-access";
import type { UserRole } from "@prisma/client";
import {
  isSingleUserBlockedInProduction,
  isSingleUserPortable,
} from "@/lib/auth/single-user";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";
import { tenantSlugFromHostHeader } from "@/lib/tenant-slug";
import { prisma } from "@/lib/prisma";
import {
  canAccessKanban,
  planAllowsCosting,
  planAllowsHistoryAndAnalytics,
  planAllowsInventory,
  planAllowsShipments,
} from "@/lib/plan-entitlements";
import type { SubscriptionPlan } from "@prisma/client";
import { VIEW_AS_ROLE_COOKIE_NAME, parseViewAsRole } from "@/lib/auth/view-as-role";
import {
  clickMigCrmPublicOrigin,
  clickMigFormHostPathRedirect,
  isClickMigFormHost,
  isClickMigPublicApiPath,
  isClickMigPublicOpen,
  isClickMigPublicSurfacePath,
} from "@/lib/clickmig/form-host";
import { assertDemoAccessSessionActive } from "@/lib/auth/demo-session.server";

function clearDemoSessionCookieOn(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_DEMO_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

function rejectDemoSession(req: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    const out = NextResponse.json(
      { error: "Демо-сессия завершена. Нужен новый код доступа." },
      { status: 401 },
    );
    return securityHeaders(clearDemoSessionCookieOn(out));
  }
  const qs = new URLSearchParams({ next: pathname, demoExpired: "1" });
  const redir = redirectPublic(req, `/login?${qs.toString()}`);
  return securityHeaders(clearDemoSessionCookieOn(redir));
}

function securityHeaders(res: NextResponse) {
  // Модалки предпросмотра внутри CRM используют iframe с тем же origin.
  // SAMEORIGIN сохраняет защиту от внешнего встраивания, но не блокирует свои окна.
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
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

function shortHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function clientLimitIdentity(req: NextRequest): { key: string; maxRequests: number } {
  const sessionToken =
    req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    req.cookies.get(SESSION_DEMO_COOKIE_NAME)?.value ||
    "";
  if (sessionToken) {
    return {
      key: `session:${shortHash(sessionToken)}`,
      maxRequests: RATE_LIMIT_AUTH_MAX_PER_WINDOW,
    };
  }
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return { key: `ip:${ip}`, maxRequests: RATE_LIMIT_IP_MAX_PER_WINDOW };
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/telegram-login")) return true;
  if (pathname.startsWith("/api/auth/telegram-webapp")) return true;
  if (pathname === "/tg-app" || pathname.startsWith("/tg-app/")) return true;
  if (pathname.startsWith("/api/auth/activate-invite")) return true;
  if (pathname.startsWith("/api/auth/reset-password")) return true;
  if (pathname.startsWith("/api/auth/bootstrap-owner")) return true;
  if (pathname.startsWith("/api/auth/status")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (pathname.startsWith("/api/auth/logout-and-go")) return true;
  if (pathname.startsWith("/api/auth/session")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/demo/start")) return true;
  if (pathname.startsWith("/api/telegram/webhook")) return true;
  if (pathname.startsWith("/api/telegram/diagnostic")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  /** QR с этикетки отгрузки: витрина без входа (клиент) + редиректы для сотрудников. */
  if (pathname.startsWith("/p/t/")) return true;
  /** Фото наряда на витрине QR (auth = slug + sticker token внутри роута). */
  if (pathname.startsWith("/api/public/sticker/")) return true;
  if (pathname.startsWith("/api/public/work-examples/")) return true;
  /** КликМиг: публичная форма, ЛК, дозагрузка, просмотр файлов. */
  if (pathname.startsWith("/p/clickmig/")) return true;
  if (pathname.startsWith("/api/clickmig/public/")) return true;
  /** Сканер книг / внешние агенты: auth внутри TenantApiKey внутри роуте. */
  if (pathname.startsWith("/api/scanner/")) return true;
  return false;
}

async function hasCrmSessionCookie(req: NextRequest): Promise<boolean> {
  if (!getAuthSecretKey()) return false;
  const demoToken = req.cookies.get(SESSION_DEMO_COOKIE_NAME)?.value;
  const mainToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (demoToken) {
    const d = await verifySessionToken(demoToken);
    if (d?.demo) return true;
  }
  if (mainToken) {
    const m = await verifySessionToken(mainToken);
    if (m && !m.demo) return true;
  }
  return false;
}

function clickMigPublicClosedResponse(pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    const out = NextResponse.json(
      { error: "Публичный КликМиг временно закрыт" },
      { status: 403 },
    );
    return securityHeaders(out);
  }
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>КликМиг</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1c1c20;color:#eee;font-family:system-ui,sans-serif">
  <main style="max-width:28rem;padding:1.5rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.75rem">КликМиг</h1>
    <p style="margin:0;line-height:1.45;color:#bbb">Приём заказов временно закрыт.</p>
  </main>
</body>
</html>`;
  const out = new NextResponse(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  return securityHeaders(out);
}

function isRateLimitExemptPath(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (pathname.startsWith("/api/telegram/webhook")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") return false;
  return (
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/client-state") ||
    pathname.startsWith("/api/attention-reminders") ||
    pathname.startsWith("/api/order-chat-corrections/toasts") ||
    pathname.startsWith("/api/order-chat-messages/toasts") ||
    pathname.startsWith("/api/order-notifications/toasts") ||
    pathname.startsWith("/api/order-prosthetics-requests/toasts") ||
    pathname.startsWith("/api/orders/search-suggest") ||
    pathname.startsWith("/api/crm-backup/progress")
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  securityHeaders(res);

  const pathname = req.nextUrl.pathname;
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  if (isClickMigFormHost(host)) {
    const formRedirect = clickMigFormHostPathRedirect(pathname);
    if (formRedirect) {
      return redirectPublic(req, formRedirect);
    }
    if (!isPublicPath(pathname)) {
      const target = new URL(
        pathname + req.nextUrl.search,
        clickMigCrmPublicOrigin(),
      );
      return securityHeaders(NextResponse.redirect(target, 307));
    }
  }

  if (req.nextUrl.pathname.startsWith("/api")) {
    if (process.env.RATE_LIMIT_DISABLED === "1") {
      /* skip */
    } else if (!isRateLimitExemptPath(req.nextUrl.pathname, req.method)) {
      const limit = clientLimitIdentity(req);
      if (!rateLimitAllow(limit.key, limit.maxRequests)) {
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

  /** Cron (Vercel / standalone-loop): Bearer CRON_SECRET или внутренний header, без сессии. */
  if (pathname.startsWith("/api/cron/")) {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = req.headers.get("authorization")?.trim();
    if (secret && auth === `Bearer ${secret}`) {
      return securityHeaders(NextResponse.next());
    }
    const mailSecret = process.env.INTERNAL_MAIL_SYNC_SECRET?.trim();
    const mailHeader = req.headers.get("x-internal-mail-sync-secret")?.trim();
    if (
      pathname === "/api/cron/mail-sync" &&
      mailSecret &&
      mailHeader === mailSecret
    ) {
      return securityHeaders(NextResponse.next());
    }
    const kaitenChatSecret = process.env.INTERNAL_KAITEN_CHAT_SYNC_SECRET?.trim();
    const kaitenChatHeader = req.headers
      .get("x-internal-kaiten-chat-sync-secret")
      ?.trim();
    if (
      pathname === "/api/cron/kaiten-chat-sync" &&
      kaitenChatSecret &&
      kaitenChatHeader === kaitenChatSecret
    ) {
      return securityHeaders(NextResponse.next());
    }
    const crmBackupSecret = process.env.INTERNAL_CRM_BACKUP_SECRET?.trim();
    const crmBackupHeader = req.headers
      .get("x-internal-crm-backup-secret")
      ?.trim();
    if (
      pathname === "/api/cron/crm-backup" &&
      crmBackupSecret &&
      crmBackupHeader === crmBackupSecret
    ) {
      return securityHeaders(NextResponse.next());
    }
    const out = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return securityHeaders(out);
  }

  if (isSingleUserBlockedInProduction()) {
    if (pathname.startsWith("/api")) {
      const out = NextResponse.json(
        { error: "Однопользовательский режим на сервере запрещён" },
        { status: 503 },
      );
      return securityHeaders(out);
    }
    return securityHeaders(
      new NextResponse("Однопользовательский режим на сервере запрещён", {
        status: 503,
      }),
    );
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
      pathname.startsWith("/api/auth/telegram-webapp") ||
      pathname.startsWith("/api/auth/activate-invite") ||
      pathname.startsWith("/api/auth/reset-password") ||
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

  if (
    (isClickMigPublicSurfacePath(pathname) || isClickMigPublicApiPath(pathname)) &&
    !isClickMigPublicOpen()
  ) {
    if (!(await hasCrmSessionCookie(req))) {
      return clickMigPublicClosedResponse(pathname);
    }
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

  if (session.demo) {
    const demoOk = await assertDemoAccessSessionActive(session.sid);
    if (!demoOk) {
      return rejectDemoSession(req, pathname);
    }
  }

  let activeUserContext:
    | {
        role: UserRole;
        tenantId: string;
        tenant: { plan: SubscriptionPlan; addonKanban: boolean } | null;
      }
    | null = null;

  try {
  if (!session.demo) {
    const sid = session.sid?.trim();
    if (!sid) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Сессия устарела. Войдите снова." },
          { status: 401 },
        );
        out.cookies.set(SESSION_COOKIE_NAME, "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        return securityHeaders(out);
      }
      const qs = new URLSearchParams({ next: pathname });
      const redir = redirectPublic(req, `/login?${qs.toString()}`);
      redir.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return securityHeaders(redir);
    }
    const active = await prisma.userDeviceSession.findUnique({
      where: { id: sid },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
            tenantId: true,
            tenant: {
              select: {
                plan: true,
                addonKanban: true,
              },
            },
          },
        },
      },
    });
    const invalid =
      !active ||
      active.userId !== session.sub ||
      active.revokedAt != null ||
      active.expiresAt.getTime() <= Date.now() ||
      !active.user ||
      active.user.isActive !== true;
    if (invalid) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Сессия завершена. Войдите снова." },
          { status: 401 },
        );
        out.cookies.set(SESSION_COOKIE_NAME, "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        return securityHeaders(out);
      }
      const qs = new URLSearchParams({ next: pathname });
      const redir = redirectPublic(req, `/login?${qs.toString()}`);
      redir.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return securityHeaders(redir);
    }
    activeUserContext = {
      role: active.user.role,
      tenantId: active.user.tenantId,
      tenant: active.user.tenant
        ? {
            plan: active.user.tenant.plan,
            addonKanban: active.user.tenant.addonKanban,
          }
        : null,
    };
  }

  const actualRole = (activeUserContext?.role ?? session.role) as UserRole;
  const viewAsRole =
    actualRole === "OWNER"
      ? parseViewAsRole(req.cookies.get(VIEW_AS_ROLE_COOKIE_NAME)?.value)
      : null;
  const role = viewAsRole ?? actualRole;
  const effectiveTenantId = activeUserContext?.tenantId ?? session.tid;

  if (!session.demo && !isSingleUserPortable()) {
    const slug = tenantSlugFromHostHeader(host);
    const tenantRow = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        tenantDatabaseEnabled: true,
        tenantDatabaseUrl: true,
        tenantDatabaseReadyAt: true,
      },
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
    if (effectiveTenantId && effectiveTenantId !== tenantRow.id) {
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
    if (tenantRow.tenantDatabaseEnabled) {
      const ready =
        Boolean(tenantRow.tenantDatabaseReadyAt) &&
        Boolean(tenantRow.tenantDatabaseUrl?.trim());
      if (!ready) {
        if (pathname.startsWith("/api/")) {
          const out = NextResponse.json(
            { error: "База организации не готова. Обратитесь к администратору." },
            { status: 503 },
          );
          return securityHeaders(out);
        }
        return securityHeaders(
          new NextResponse("База организации пока не готова.", { status: 503 }),
        );
      }
    }
  }

  const plan: SubscriptionPlan =
    activeUserContext?.tenant?.plan ?? session.plan ?? "ULTRA";
  const addonK =
    activeUserContext?.tenant?.addonKanban === true ||
    session.addonKanban === true;

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
    if (
      pathname.startsWith("/shipments") ||
      pathname.startsWith("/api/shipments") ||
      isOrdersShipmentListPath(pathname, req.nextUrl.search)
    ) {
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
    if (!planAllowsHistoryAndAnalytics(plan)) {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Аналитика — с тарифа «Оптимального»" },
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

  if (
    pathname.startsWith("/directory/access") ||
    pathname.startsWith("/directory/logs") ||
    pathname.startsWith("/api/directory/logs") ||
    pathname.startsWith("/directory/crm-dump") ||
    pathname.startsWith("/api/directory/crm-dump") ||
    pathname.startsWith("/api/directory/crm-backup")
  ) {
    if (actualRole !== "OWNER") {
      if (pathname.startsWith("/api/")) {
        const out = NextResponse.json(
          { error: "Нет доступа" },
          { status: 403 },
        );
        return securityHeaders(out);
      }
      return redirectPublic(req, "/directory");
    }
  }

  if (pathname.startsWith("/api/role-module-access") && role !== "OWNER") {
    const out = NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    return securityHeaders(out);
  }

  if (!session.demo && !isSingleUserPortable() && effectiveTenantId) {
    const access = await getEffectiveModuleAccess(effectiveTenantId, role);
    const mod = getModuleForPathname(pathname);
    const requiredModule = requiredModuleForPath(
      pathname,
      mod,
      req.method,
      req.nextUrl.search,
      req.headers,
    );
    if (requiredModule != null && access[requiredModule] !== true) {
      let moduleAllowed = false;
      if (
        requiredModule === "CONFIG_MAIL" &&
        effectiveTenantId &&
        session.sub &&
        !session.demo
      ) {
        const db = await getOrdersPrisma();
        moduleAllowed = await canOpenMailSettingsModule(
          db,
          effectiveTenantId,
          session.sub,
          role,
          access,
        );
      }
      if (
        !moduleAllowed &&
        isOrderAttachmentUploadAllowed(
          access,
          pathname,
          req.method,
          req.headers,
        )
      ) {
        moduleAllowed = true;
      }
      if (
        !moduleAllowed &&
        isKanbanLinkedReadAllowed(access, pathname, req.method)
      ) {
        moduleAllowed = true;
      }
      if (
        !moduleAllowed &&
        isOrdersShipmentListPath(pathname, req.nextUrl.search) &&
        (access.ORDERS === true || access.SHIPMENTS === true)
      ) {
        moduleAllowed = true;
      }
      if (
        !moduleAllowed &&
        pathname === "/api/shipments/orders-list-pdf" &&
        (access.ORDERS === true || access.SHIPMENTS === true)
      ) {
        moduleAllowed = true;
      }
      if (!moduleAllowed) {
        if (pathname.startsWith("/api/")) {
          const out = NextResponse.json(
            { error: "Нет доступа к этому разделу" },
            { status: 403 },
          );
          return securityHeaders(out);
        }
        const home =
          access.ORDERS === true
            ? "/orders"
            : access.KANBAN === true
              ? "/kanban"
              : "/";
        return redirectPublic(req, home);
      }
    }
  }
  } catch (e) {
    console.error("[middleware] access gate", pathname, e);
    if (pathname.startsWith("/api/")) {
      const details = e instanceof Error ? e.message : String(e);
      return securityHeaders(
        NextResponse.json(
          {
            error: "Временная ошибка доступа",
            details: details.slice(0, 500),
          },
          { status: 503 },
        ),
      );
    }
    return redirectPublic(req, "/orders");
  }

  return res;
}

export const config = {
  /** Node runtime: Edge middleware could verify JWT with empty/wrong AUTH_SECRET if .env appeared only after `next build`. */
  runtime: "nodejs",
  /** POST вложений не гоняем через middleware: Next клонирует тело и на больших файлах отдаёт HTML 500. */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/orders/[^/]+/attachments(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
