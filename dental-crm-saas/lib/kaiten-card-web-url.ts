import { getKaitenEnvConfig } from "@/lib/kaiten-config";

function originFromApiBase(apiBase: string): string | null {
  const trimmed = apiBase.replace(/\/+$/, "");
  const withoutApi = trimmed.replace(/\/api\/v\d+$/i, "");
  return withoutApi.length > 0 ? withoutApi : null;
}

/**
 * Публичная ссылка на карточку Kaiten по числовому id.
 *
 * Задайте точный шаблон, если путь у вашей инстанции другой:
 * `KAITEN_CARD_URL_TEMPLATE=https://ваш.kaiten.ru/space/…/card/{id}`
 *
 * Иначе: `KAITEN_WEB_ORIGIN` или origin из `KAITEN_API_BASE_URL` без `/api/v1`,
 * путь `/{id}` (как у clicklab.kaiten.ru — без сегмента `cards`).
 */
export function getKaitenCardWebUrl(cardId: number): string | null {
  const tpl = process.env.KAITEN_CARD_URL_TEMPLATE?.trim();
  if (tpl) {
    return tpl.replace(/\{id\}/gi, String(cardId));
  }

  const path = `/${cardId}`;

  const explicitOrigin = process.env.KAITEN_WEB_ORIGIN?.trim();
  if (explicitOrigin) {
    return `${explicitOrigin.replace(/\/+$/, "")}${path}`;
  }

  const envApi = process.env.KAITEN_API_BASE_URL?.trim();
  if (envApi) {
    const o = originFromApiBase(envApi);
    if (o) return `${o}${path}`;
  }

  const cfg = getKaitenEnvConfig();
  if (cfg?.apiBase) {
    const o = originFromApiBase(cfg.apiBase);
    if (o) return `${o}${path}`;
  }

  return null;
}
