import type {
  ButtonAction,
  ReplyBlock,
  ReplyBlockType,
  ReplyEditorDocument,
} from "./types";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const PUBLIC_URL_RE = /^https?:\/\/.+/i;
const PLACEHOLDER_URL_RE = /^\{\{\s*\w+\s*\}\}$/;

export function newReplyBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isValidHexColor(value: string | undefined): boolean {
  if (!value) return true;
  return HEX_COLOR_RE.test(value.trim());
}

function isValidButtonHref(href: string, allowPlaceholder: boolean): boolean {
  const t = href.trim();
  if (!t) return false;
  if (allowPlaceholder && PLACEHOLDER_URL_RE.test(t)) return true;
  if (t.includes("{{")) return allowPlaceholder;
  return PUBLIC_URL_RE.test(t);
}

export function validateButtonAction(action: ButtonAction): string | null {
  if (action.type === "url") {
    if (!isValidButtonHref(action.href, true)) {
      return "Укажите ссылку (https://…) или плейсхолдер {{orderStatusUrl}}";
    }
    return null;
  }
  if (action.type === "download") {
    if (!isValidButtonHref(action.href, false)) {
      return "Для скачивания нужна публичная ссылка https://…";
    }
    return null;
  }
  if (action.type === "tel") {
    const phone = action.phone.trim();
    if (!phone || phone.length > 40) return "Укажите номер телефона";
    return null;
  }
  return "Неизвестное действие кнопки";
}

export function validateReplyEditorDocument(doc: ReplyEditorDocument): string[] {
  const issues: string[] = [];
  if (doc.version !== 1) {
    issues.push("Неподдерживаемая версия документа");
    return issues;
  }
  if (!Array.isArray(doc.blocks)) {
    issues.push("Нет списка блоков");
    return issues;
  }
  for (const block of doc.blocks) {
    if (!block.id?.trim()) {
      issues.push("У блока нет id");
      continue;
    }
    const style = block.style;
    if (style) {
      if (!isValidHexColor(style.backgroundColor)) issues.push(`Блок ${block.id}: неверный цвет фона`);
      if (!isValidHexColor(style.textColor)) issues.push(`Блок ${block.id}: неверный цвет текста`);
      if (!isValidHexColor(style.buttonBgColor)) issues.push(`Блок ${block.id}: неверный цвет кнопки`);
      if (!isValidHexColor(style.buttonTextColor)) issues.push(`Блок ${block.id}: неверный цвет текста кнопки`);
    }
    switch (block.type) {
      case "hero":
        if (!block.headline.trim()) issues.push("Шапка: укажите заголовок");
        break;
      case "text":
        if (!block.content.trim()) issues.push(`Текст (${block.id}): пустое содержимое`);
        break;
      case "buttons":
        if (block.buttons.length === 0) issues.push("Кнопки: добавьте хотя бы одну");
        for (const btn of block.buttons) {
          if (!btn.label.trim()) issues.push("Кнопка: укажите подпись");
          const actionIssue = validateButtonAction(btn.action);
          if (actionIssue) issues.push(`Кнопка «${btn.label || "?"}»: ${actionIssue}`);
        }
        break;
      case "image":
        if (!block.assetId?.trim()) issues.push("Картинка: выберите файл");
        if (block.widthPx < 40 || block.widthPx > 800) issues.push("Картинка: ширина 40–800 px");
        break;
      case "divider":
        if (block.heightPx < 4 || block.heightPx > 80) issues.push("Разделитель: высота 4–80 px");
        break;
      case "attach_hint":
        if (!block.text.trim()) issues.push("Вложения: укажите текст");
        break;
      case "footer":
        if (!block.text.trim()) issues.push("Футер: укажите текст");
        for (const link of block.links ?? []) {
          if (!link.label.trim() || !isValidButtonHref(link.href, true)) {
            issues.push("Футер: неверная ссылка");
          }
        }
        break;
      default:
        issues.push(`Неизвестный тип блока: ${(block as ReplyBlock).type}`);
    }
  }
  return issues;
}

export function createEmptyBlock(type: ReplyBlockType, id: string): ReplyBlock {
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        headline: "Ваш заказ {{orderNumber}} принят!",
        style: { backgroundColor: "#e8f4fc", textColor: "#111827", paddingPx: 24, fontSizePx: 16 },
      };
    case "text":
      return {
        id,
        type: "text",
        content: "Текст письма…",
        style: { backgroundColor: "#ffffff", textColor: "#374151", paddingPx: 20, fontSizePx: 15 },
      };
    case "buttons":
      return {
        id,
        type: "buttons",
        buttons: [
          {
            id: `${id}-btn-1`,
            label: "Кнопка",
            variant: "primary",
            action: { type: "url", href: "{{orderStatusUrl}}" },
          },
        ],
        style: {
          backgroundColor: "#ffffff",
          paddingPx: 16,
          buttonBgColor: "#2563eb",
          buttonTextColor: "#ffffff",
          buttonRadiusPx: 8,
          align: "center",
        },
      };
    case "image":
      return {
        id,
        type: "image",
        assetId: "",
        widthPx: 240,
        align: "center",
        style: { backgroundColor: "#ffffff", paddingPx: 16 },
      };
    case "divider":
      return { id, type: "divider", heightPx: 16, color: "#e5e7eb" };
    case "attach_hint":
      return {
        id,
        type: "attach_hint",
        text: "Прайс-лист приложен к письму.",
        style: { backgroundColor: "#f9fafb", textColor: "#6b7280", paddingPx: 12, fontSizePx: 13 },
      };
    case "footer":
      return {
        id,
        type: "footer",
        text: "С уважением, лаборатория",
        style: { backgroundColor: "#f3f4f6", textColor: "#6b7280", paddingPx: 16, fontSizePx: 12 },
      };
  }
}
