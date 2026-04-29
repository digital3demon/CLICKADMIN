import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ActiveUserGate } from "@/components/auth/ActiveUserGate";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { fontBody, fontDisplay } from "@/lib/app-fonts";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description: "Учёт нарядов зуботехнической лаборатории",
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
  const themeInit = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var sys=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=t==="dark"||(t!=="light"&&sys);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${fontBody.variable} ${fontDisplay.variable}`}
    >
      <body className={`${fontBody.className} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <AppProviders>
          <ActiveUserGate />
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
