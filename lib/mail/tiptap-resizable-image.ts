import Image from "@tiptap/extension-image";

export const DEFAULT_REPLY_TEMPLATE_IMAGE_WIDTH_PX = 240;

export const REPLY_TEMPLATE_IMAGE_WIDTH_PRESETS = [120, 180, 240, 320, 480] as const;

function parseWidthFromElement(element: HTMLElement): string | null {
  const widthAttr = element.getAttribute("width");
  if (widthAttr && /^\d+$/.test(widthAttr)) return widthAttr;
  const style = element.getAttribute("style") ?? "";
  const px = /width:\s*(\d+)px/i.exec(style);
  if (px?.[1]) return px[1];
  const pct = /width:\s*(\d+)%/i.exec(style);
  if (pct?.[1]) return `${pct[1]}%`;
  return null;
}

/** Картинки в шаблоне письма: width в HTML для письма и редактора. */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (element) => parseWidthFromElement(element),
        renderHTML: (attributes) => {
          const raw = attributes.width;
          if (!raw) return {};
          const value = String(raw);
          if (value.endsWith("%")) {
            return {
              width: value,
              style: `width: ${value}; height: auto; max-width: 100%;`,
            };
          }
          const px = value.replace(/px$/i, "");
          if (!/^\d+$/.test(px)) return {};
          return {
            width: px,
            style: `width: ${px}px; height: auto; max-width: 100%;`,
          };
        },
      },
    };
  },
});
