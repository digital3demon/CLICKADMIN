import type { ReplyEditorDocument } from "../types";
import { newReplyBlockId } from "../validate";

export function createClickLabPreset(): ReplyEditorDocument {  const heroId = newReplyBlockId();
  const introId = newReplyBlockId();
  const buttonsId = newReplyBlockId();
  const stepsId = newReplyBlockId();
  const attachId = newReplyBlockId();
  const footerId = newReplyBlockId();

  return {
    version: 1,
    global: { contentWidthPx: 600, fontFamily: "Arial, sans-serif" },
    blocks: [
      {
        id: heroId,
        type: "hero",
        logoAssetId: null,
        headline: "Ваш заказ {{orderNumber}} принят!",
        subtitle: "Работа будет выполнена по срокам лаборатории",
        style: {
          backgroundColor: "#e8f4fc",
          textColor: "#111827",
          paddingPx: 28,
          fontSizePx: 22,
          align: "center",
        },
      },
      {
        id: introId,
        type: "text",
        editableInPreflight: true,
        content:
          "Ваш заказ {{orderNumber}} принят! Работа будет выполнена и доставлена по срокам нашей лаборатории.\n\nСо сроками вы можете ознакомиться в прайс-листе, который приложен во вложении.\n\nСпасибо за заказ!\n\nОжидаемый срок отгрузки работы из лаборатории {{date}}.",
        style: {
          backgroundColor: "#ffffff",
          textColor: "#374151",
          paddingPx: 24,
          fontSizePx: 15,
          align: "left",
        },
      },
      {
        id: buttonsId,
        type: "buttons",
        buttons: [
          {
            id: `${buttonsId}-primary`,
            label: "Узнать статус заказа",
            variant: "primary",
            action: { type: "url", href: "{{orderStatusUrl}}" },
          },
          {
            id: `${buttonsId}-secondary`,
            label: "Связаться с администратором",
            variant: "secondary",
            action: { type: "url", href: "https://t.me/clicklab_admin" },
          },
        ],
        style: {
          backgroundColor: "#ffffff",
          paddingPx: 20,
          buttonBgColor: "#2563eb",
          buttonTextColor: "#ffffff",
          buttonRadiusPx: 8,
          align: "center",
        },
      },
      {
        id: stepsId,
        type: "text",
        content:
          "Что будет дальше\n\n1. Мы приняли заказ в работу и назначили сроки.\n2. По готовности уведомим вас о статусе.\n3. Проверьте вложения к письму — там прайс-лист лаборатории.",
        style: {
          backgroundColor: "#0d9488",
          textColor: "#ffffff",
          paddingPx: 24,
          fontSizePx: 15,
          align: "left",
        },
      },
      {
        id: attachId,
        type: "attach_hint",
        text: "Прайс-лист и материалы — во вложении к этому письму.",
        style: {
          backgroundColor: "#f9fafb",
          textColor: "#6b7280",
          paddingPx: 14,
          fontSizePx: 13,
          align: "center",
        },
      },
      {
        id: footerId,
        type: "footer",
        text: "КЛИК ЛАБ · Проект Всеволода Соколова",
        links: [{ label: "Telegram", href: "https://t.me/clicklab_admin" }],
        style: {
          backgroundColor: "#f3f4f6",
          textColor: "#6b7280",
          paddingPx: 18,
          fontSizePx: 12,
          align: "center",
        },
      },
    ],
  };
}

export const SAMPLE_ORDER_STATUS_URL = "https://crm.example/p/t/lab/s/preview-token";
