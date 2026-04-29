import { Manrope, Unbounded } from "next/font/google";

/**
 * Основной текст (кириллица). Опционально Muller: `public/fonts/` + @font-face в globals.css.
 */
export const fontBody = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-loaded",
});

/** Заголовки модулей и название в сайдбаре (дисплей). */
export const fontDisplay = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-display-loaded",
});
