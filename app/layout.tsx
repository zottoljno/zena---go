import type { Metadata } from "next";
import "./globals.css";
import Footer from "./Footer";

export const metadata: Metadata = {
  title: "Zena & GO",
  description:
    "Nessuna spedizione, zero commissioni, nessuna attesa. Cerca, trova, accordati, compra.",
  verification: {
    google: "JvOh0rs1QnWYgpke4bgmMtk5SliE2bgPMdlHOZnT2kg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col justify-between bg-white text-slate-900 antialiased">
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
