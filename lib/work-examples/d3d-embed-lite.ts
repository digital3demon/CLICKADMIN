/**
 * Lite-профиль D3D embed (3d viever/embed/AGENTS.md + lite-hide.css).
 * Оставляем orbit, виды, ориентацию, панель объектов.
 * Не трогаем #mesh-panel, #exocad-views-panel, #view-orientation-mount.
 */

export const D3D_EMBED_LITE_STYLE_ID = "embed-lite";

export const D3D_EMBED_LITE_CSS = `#articulator-panel,
#layers-dock,
#mobile-contacts-bar,
#comment-bubbles,
#measure-labels,
#html-contacts,
#html-contacts-dynamic,
#html-contacts-jaws,
#html-contacts-mobile,
#html-contacts-dynamic-mobile,
#html-contacts-jaws-mobile,
#mobile-dock [data-mobile-sheet="articulator"],
#mobile-dock [data-mobile-sheet="layers"],
#mobile-sheet-articulator,
#mobile-sheet-layers {
  display: none !important;
}

.layers-dock__btn[data-layer="comments"],
.layers-dock__btn[data-layer="ruler"],
.layers-dock__btn[data-layer="thickness"],
.layers-dock__btn[data-layer="marker"] {
  display: none !important;
}
`;

/** Вариант A: вставить style в HTML перед </head> (кириллица вокруг тега не мешает). */
export function injectD3dEmbedLiteCss(html: string): string {
  const text = String(html || "");
  if (text.includes(`id="${D3D_EMBED_LITE_STYLE_ID}"`)) return text;
  const tag = `<style id="${D3D_EMBED_LITE_STYLE_ID}">${D3D_EMBED_LITE_CSS}</style>`;
  const close = text.search(/<\/head>/i);
  if (close >= 0) return text.slice(0, close) + tag + text.slice(close);
  return tag + text;
}

export function injectD3dEmbedLiteIntoDocument(doc: Document): void {
  if (doc.getElementById(D3D_EMBED_LITE_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = D3D_EMBED_LITE_STYLE_ID;
  style.textContent = D3D_EMBED_LITE_CSS;
  (doc.head ?? doc.documentElement).appendChild(style);
}
