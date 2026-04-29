import type { NextConfig } from "next";

/**
 * Безопасность SaaS: CRM_HSTS=1 → HSTS на edge (транспорт). Секреты — только в env; лимиты — `lib/server/rate-limit*`.
 * Данные: для облачного мультитенанта надёжнее managed Postgres (шифрование at rest на стороне провайдера), чем SQLCipher+Prisma+SQLite;
 * self-hosted: шифрование диска (BitLocker) + бэкапы.
 */
const nextConfig: NextConfig = {
  env: {
    CRM_BUILD: "commercial",
    NEXT_PUBLIC_CRM_BUILD: "commercial",
  },

  async headers() {
    if (process.env.CRM_HSTS !== "1") return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
        ],
      },
    ];
  },
  /** Папка `.next/standalone` + `npm run package:windows` → `dist/dental-lab-crm-portable` + `Запуск.bat`. */
  output: "standalone",
  /** Windows-сборка: в архив явно кладём нативный canvas под Linux (pdf-parse / pdfjs). */
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*"],
  },
  serverExternalPackages: [
    "@prisma/client",
    "@napi-rs/canvas",
    "pdf-parse",
    "pdfjs-dist",
    "exceljs",
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/pdfkit",
    "@react-pdf/layout",
    "@react-pdf/render",
    "@react-pdf/image",
    "@react-pdf/png-js",
  ],
  experimental: {
    optimizePackageImports: ["framer-motion", "recharts"],
  },
};

export default nextConfig;
