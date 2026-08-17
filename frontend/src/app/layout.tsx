import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Fraunces, Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import OrderMigration from "@/components/OrderMigration";
import { LanguageProvider } from "@/lib/LanguageProvider";
import { LANG_KEY, dirOf, preferredLang, toLang } from "@/lib/i18n";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "AL-MASA — مكتب الماسة",
  description:
    "Point of sale and storefront for medical, skincare, and supplement products.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AL-MASA",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Matches the storefront's paper, so the status bar reads as part of the
  // app rather than as browser chrome sitting on top of it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#16130e" },
  ],
};

/* Applies the saved theme before first paint to avoid a flash. */
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the language before rendering a single word, so the markup the
  // browser receives is already correct — nothing to fix up after hydration
  // and no flash of the wrong language.
  //   1. the cookie the toggle writes (an explicit choice always wins), then
  //   2. the browser's Accept-Language on a first visit.
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const lang =
    toLang(cookieStore.get(LANG_KEY)?.value) ??
    preferredLang(headerStore.get("accept-language"));

  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${fraunces.variable} ${archivo.variable} ${plexArabic.variable} font-sans antialiased`}
      >
        <LanguageProvider initialLang={lang}>
          {children}
          <OrderMigration />
          <PWARegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
