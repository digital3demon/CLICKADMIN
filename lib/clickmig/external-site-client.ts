/**
 * Клиент для test.click-lab.online и других фронтов КликМиг.
 * Базовый URL CRM + API key из конфигурации.
 */

export type ClickMigPublicClientOptions = {
  baseUrl: string;
  apiKey: string;
};

export function createClickMigPublicClient(opts: ClickMigPublicClientOptions) {
  const headers = (): HeadersInit => ({
    "x-clickmig-api-key": opts.apiKey,
  });

  return {
    async getConfig() {
      const res = await fetch(`${opts.baseUrl}/api/clickmig/public/config`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error("CONFIG_FAILED");
      return res.json();
    },

    async validateApplication(body: Record<string, unknown>) {
      const res = await fetch(
        `${opts.baseUrl}/api/clickmig/public/applications/validate`,
        {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return res.json();
    },

    async submitApplication(formData: FormData) {
      const res = await fetch(`${opts.baseUrl}/api/clickmig/public/applications`, {
        method: "POST",
        headers: headers(),
        body: formData,
      });
      return { ok: res.ok, status: res.status, body: await res.json() };
    },

    async login(email: string, password: string) {
      const res = await fetch(`${opts.baseUrl}/api/clickmig/public/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return res.ok;
    },
  };
}

/** Env для внешнего фронта. Ключ не из NEXT_PUBLIC_ — задайте apiKey с сервера. */
export function clickMigPublicEnvFromProcess(): ClickMigPublicClientOptions {
  return {
    baseUrl:
      process.env.NEXT_PUBLIC_CLICKMIG_CRM_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000",
    apiKey: "",
  };
}
