import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

/** Совпадает с dependencies @fontsource/noto-sans (fallback CDN для standalone). */
const NOTO_SANS_PKG_VERSION = "5.2.10";
const NOTO_WOFF_FILES = {
  400: "noto-sans-cyrillic-400-normal.woff",
  700: "noto-sans-cyrillic-700-normal.woff",
} as const;

function resolveNotoFontSrc(file: string): string {
  const local = path.join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans/files",
    file,
  );
  if (fs.existsSync(local)) {
    return local;
  }
  return `https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@${NOTO_SANS_PKG_VERSION}/files/${file}`;
}

let notoPdfFontsRegistered = false;

/** Для @react-pdf: кириллица в PDF (наряд, сверка и т.д.). */
export function ensureNotoSansPdfFonts(): void {
  if (notoPdfFontsRegistered) return;
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: resolveNotoFontSrc(NOTO_WOFF_FILES[400]), fontWeight: 400 },
      { src: resolveNotoFontSrc(NOTO_WOFF_FILES[700]), fontWeight: 700 },
    ],
  });
  notoPdfFontsRegistered = true;
}
