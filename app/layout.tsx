import type { Metadata, Viewport } from "next";
import "./globals.css";
import Footer from "./Footer";

export const metadata: Metadata = {
  title: "Zena & GO",
  description:
    "Nessuna spedizione, zero commissioni, nessuna attesa. Cerca, trova, accordati, compra.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zena & GO",
  },
  verification: {
    google: "JvOh0rs1QnWYgpke4bgmMtk5SliE2bgPMdlHOZnT2kg",
  },
};

// BLOCCA IL PINCH-ZOOM INDIETRO E ANCORA LA PAGINA AL 100% DELLO SCHERMO
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="overflow-x-hidden w-full">
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col justify-between bg-white text-slate-900 antialiased overflow-x-hidden w-full max-w-full">
        <main className="flex-grow w-full max-w-full overflow-x-hidden">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
