import type { NextConfig } from "next";

/**
 * CRM_HSTS=1 → HSTS. Коммерция/SaaS — в каталоге `dental-crm-saas/`.
 */
const nextConfig: NextConfig = {
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
  /** Windows-сборка и Docker standalone: pdfjs worker + canvas, иначе getText падает. */
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/pdf-parse/**/*",
      "./prisma/schema.prisma",
      "./prisma/migrations/**/*",
    ],
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
    /** Иначе Next 15 клонирует тело в middleware и режет ~10MB → HTML 500 на фото/STL. */
    middlewareClientMaxBodySize: "1gb",
  },
};

export default nextConfig;
