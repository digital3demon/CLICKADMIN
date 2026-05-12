import type { Metadata, Viewport } from "next";
import { ActiveUserGate } from "@/components/auth/ActiveUserGate";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { fontBody, fontDisplay } from "@/lib/app-fonts";
import { THEME_BOOTSTRAP_INLINE_SCRIPT } from "@/lib/theme-storage";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description: "Учёт нарядов зуботехнической лаборатории",
  icons: {
    icon: [
      { url: "/favicons/favicon-blue-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicons/favicon-blue-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicons/favicon-blue-144.png", sizes: "144x144", type: "image/png" },
    ],
    shortcut: ["/favicons/favicon-blue-48.png"],
    apple: [{ url: "/favicons/favicon-white-144.png", sizes: "144x144", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ecf2" },
    { media: "(prefers-color-scheme: dark)", color: "#2e2e34" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${fontBody.variable} ${fontDisplay.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_INLINE_SCRIPT }}
        />
      </head>
      <body className={`${fontBody.className} antialiased`}>
        <AppProviders>
          <ActiveUserGate />
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
