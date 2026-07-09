/**
 * Очистка текста письма для поля «Заказ от клиента»:
 * дословные слова клиента, без подписей и служебных блоков.
 */

import { dedupeDuplicateBracketUrls } from "@/lib/mail/mail-text-cleanup";
import {
  PLAIN_TEXT_URL_RE,
  trimTrailingUrlPunctuation,
} from "@/lib/linkify-plain-text";

const SIGNATURE_MARKERS = [
  /^--\s*$/m,
  /^с уважением/miu,
  /^best regards/mi,
  /^regards,/mi,
  /^отправлено с (iphone|android|mail)/miu,
  /^получите outlook/miu,
];

const LABELED_HEADER_LINE_RE =
  /^(?:Врач|Доктор|Пациент|Клиника|Заказчик|Организация|От|Дата|Письмо|Тема|Fwd|Re)\s*:/iu;

/** Строка-подпись к ссылке: «Сканы, фото по ссылке:» и т.п. */
const LINK_CAPTION_HINT_RE =
  /(?:ссылк|скан|фото|фотограф|кт|мрт|диск|яндекс|yandex|drive|папк|посмотр|скачать|rvg|цвет)/iu;

function normalizeUrlForCompare(url: string): string {
  return trimTrailingUrlPunctuation(url.trim()).href.toLowerCase();
}

function isUrlOnlyLine(line: string): boolean {
  const t = line.trim();
  return /^<?https?:\/\/\S+>?$/iu.test(t);
}

function lineLooksLikeLinkCaption(line: string): boolean {
  const t = line.trim();
  if (!t || LABELED_HEADER_LINE_RE.test(t)) return false;
  return LINK_CAPTION_HINT_RE.test(t) || /:\s*$/.test(t);
}

function prepareEmailBodyForLinkExtract(raw: string): string {
  return stripEmailHeaderLines(stripEmailSignatures(dedupeDuplicateBracketUrls(raw.trim())));
}

export function stripEmailSignatures(text: string): string {
  let out = text.trim();
  for (const re of SIGNATURE_MARKERS) {
    const m = out.match(re);
    if (m && m.index != null && m.index > 0) {
      out = out.slice(0, m.index).trim();
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Убрать явные строки шапки пересылки, если ИИ их оставил. */
export function stripEmailHeaderLines(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (/^письмо\s*:/iu.test(t)) return false;
    if (/^от\s*:/iu.test(t) && t.includes("@")) return false;
    if (/^дата\s*:/iu.test(t)) return false;
    if (/^fwd\s*:/iu.test(t)) return false;
    if (/^пересл/i.test(t) && t.length < 80) return false;
    return true;
  });
  return filtered.join("\n").trim();
}

export function normalizeClientOrderText(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return stripEmailHeaderLines(stripEmailSignatures(raw.trim()));
}

/**
 * Фрагменты письма со ссылками (подпись + URL), для блока «Заказ от клиента».
 */
export function extractLinkSnippetsFromEmailBody(raw: string | null | undefined): string[] {
  const body = prepareEmailBodyForLinkExtract(raw ?? "");
  if (!body) return [];

  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const snippets: string[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const urlMatches = [...line.matchAll(PLAIN_TEXT_URL_RE)];
    if (urlMatches.length === 0) continue;

    const inlineDescription = !isUrlOnlyLine(line) && urlMatches[0]!.index! > 0;

    for (const match of urlMatches) {
      const rawUrl = match[0];
      if (!rawUrl) continue;
      const url = trimTrailingUrlPunctuation(rawUrl).href;
      const urlKey = normalizeUrlForCompare(url);
      if (seenUrls.has(urlKey)) continue;
      seenUrls.add(urlKey);

      let snippet: string;
      if (inlineDescription) {
        snippet = line;
      } else {
        const caption =
          i > 0 && lineLooksLikeLinkCaption(lines[i - 1]!) ? lines[i - 1]! : "";
        snippet = caption ? `${caption}\n${url}` : url;
      }
      snippets.push(snippet.trim());
    }
  }

  return snippets;
}

/** «Вид работы: …» → только содержимое после двоеточия. */
const WORK_TYPE_LINE_PREFIX_RE = /^вид\s+работ\S*\s*[:：]\s*/iu;

function normalizeClientOrderWorkLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const stripped = trimmed.replace(WORK_TYPE_LINE_PREFIX_RE, "").trim();
  return stripped || trimmed;
}

/** Строки заказа из тела письма (без Врач:/Пациент:/…, без «Вид работы:»). */
export function buildClientOrderTextFromEmailBody(
  text: string | null | undefined,
): string | null {
  const body = text?.trim() ?? "";
  if (!body) return null;

  const workLines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || LABELED_HEADER_LINE_RE.test(trimmed)) continue;
    const normalized = normalizeClientOrderWorkLine(trimmed);
    if (normalized) workLines.push(normalized);
  }
  const joined = workLines.join("\n").trim();
  return joined || null;
}

const MIN_EMAIL_CLIENT_ORDER_LEN = 8;

/**
 * «Заказ от клиента»: при наличии письма — все строки работы из тела письма;
 * иначе текст ИИ. Ссылки из письма дописываются, если их не хватает.
 */
export function resolveClientOrderTextFromEmailAndAi(
  aiRaw: string | null | undefined,
  emailBody: string | null | undefined,
): string {
  const fullEmail = emailBody?.trim() ?? "";
  const emailWork = normalizeClientOrderText(
    buildClientOrderTextFromEmailBody(fullEmail) ?? "",
  );
  const aiText = normalizeClientOrderText(aiRaw);

  const base =
    emailWork.length >= MIN_EMAIL_CLIENT_ORDER_LEN
      ? emailWork
      : aiText || emailWork;

  if (!fullEmail) return base;
  return appendMissingLinkSnippetsToClientOrderText(base, fullEmail);
}

/** Дописывает в «Заказ от клиента» ссылки из письма, если ИИ их не перенёс. */
export function appendMissingLinkSnippetsToClientOrderText(
  clientOrderText: string,
  emailBody: string,
): string {
  const base = clientOrderText.trim();
  const snippets = extractLinkSnippetsFromEmailBody(emailBody);
  if (snippets.length === 0) return base;

  const baseNorm = base.toLowerCase();
  const missing = snippets.filter((snippet) => {
    const url = snippet.match(PLAIN_TEXT_URL_RE)?.[0];
    if (!url) return false;
    return !baseNorm.includes(normalizeUrlForCompare(url));
  });
  if (missing.length === 0) return base;
  return base ? `${base}\n\n${missing.join("\n\n")}` : missing.join("\n\n");
}
