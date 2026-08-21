import type { NextRequest } from "next/server";

/** Поддомены, где показываем только публичный контур КликМиг (форма, ЛК). */
const DEFAULT_CLICKMIG_FORM_HOSTS = ["test.click-lab.online"] as const;

function hostWithoutPort(host: string | null | undefined): string {
  if (!host?.trim()) return "";
  return host.split(":")[0]!.toLowerCase();
}

export function clickMigFormHostAllowlist(): string[] {
  const extra =
    process.env.CLICKMIG_FORM_HOSTS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return [...DEFAULT_CLICKMIG_FORM_HOSTS, ...extra];
}

export function isClickMigFormHost(host: string | null | undefined): boolean {
  const h = hostWithoutPort(host);
  if (!h) return false;
  return clickMigFormHostAllowlist().includes(h);
}

/** Form-поддомен или основной CRM-хост — публичный API без внешнего API key. */
export function isTrustedClickMigPublicHost(
  host: string | null | undefined,
): boolean {
  if (isClickMigFormHost(host)) return true;
  const h = hostWithoutPort(host);
  if (!h) return false;
  if (
    process.env.NODE_ENV !== "production" &&
    (h === "localhost" || h === "127.0.0.1")
  ) {
    return true;
  }
  try {
    const crmHost = hostWithoutPort(new URL(clickMigCrmPublicOrigin()).host);
    return h === crmHost;
  } catch {
    return false;
  }
}

export function hostFromNextRequest(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    ""
  );
}

/** Основной CRM-хост для редиректа со staff-разделов с form-поддомена. */
export function clickMigCrmPublicOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CRM_PUBLIC_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://click-lab.online";
}

/**
 * Корень form-поддомена → публичные страницы КликМиг.
 * null — редирект не нужен.
 */
export function clickMigFormHostPathRedirect(pathname: string): string | null {
  if (pathname === "/" || pathname === "/form") {
    return "/p/clickmig/form";
  }
  if (pathname === "/cabinet" || pathname === "/lk") {
    return "/p/clickmig/cabinet";
  }
  return null;
}

export { hostWithoutPort as clickMigHostWithoutPort };
