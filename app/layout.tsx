import type { Metadata } from "next";
import "./globals.css";
import Footer from "./Footer";

export const metadata: Metadata = {
  title: "Zena & Go - Il Marketplace di Genova",
  description: "Compra e vendi a mano nei quartieri di Genova",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col justify-between bg-white text-slate-900 antialiased">
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
