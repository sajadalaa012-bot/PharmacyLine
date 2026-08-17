import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import OrderMigration from "@/components/OrderMigration";
import { LanguageProvider } from "@/lib/LanguageProvider";
import { DEFAULT_LANG, LANG_KEY, dirOf, toLang } from "@/lib/i18n";
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
  // The storefront's paper. The app opens light whatever the OS prefers, so
  // this is a single colour rather than a pair; ThemeToggle repaints it when
  // someone switches to dark.
  themeColor: "#f5f2ec",
};

/* Applies the saved theme before first paint to avoid a flash. Light is the
   shop's own look, so only an explicit choice of dark turns the lights down —
   the OS preference does not decide for the visitor. */
const themeInit = `try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the language before rendering a single word, so the markup the
  // browser receives is already correct — nothing to fix up after hydration
  // and no flash of the wrong language: the cookie the toggle writes if there
  // is one, otherwise the shop's own language.
  const cookieStore = await cookies();
  const lang = toLang(cookieStore.get(LANG_KEY)?.value) ?? DEFAULT_LANG;

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
