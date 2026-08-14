import localFont from "next/font/local";

/**
 * Основной текст (кириллица). Файлы в public/fonts — сборка без Google Fonts.
 * Опционально Muller: `public/fonts/` + @font-face в globals.css.
 */
export const fontBody = localFont({
  src: "../public/fonts/Manrope-Variable.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-body-loaded",
});

/** Заголовки модулей и название в сайдбаре (дисплей). */
export const fontDisplay = localFont({
  src: "../public/fonts/Unbounded-Variable.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--font-display-loaded",
});
