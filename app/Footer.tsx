'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Se siamo nella chat, nascondi completamente il footer per lasciare tutto lo spazio all'interfaccia chat
  if (pathname?.startsWith('/chat')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 text-xs text-slate-500">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="font-bold text-slate-900">Zena &amp; Go</p>
          <p className="text-[11px] text-slate-400">Il marketplace di quartiere a Genova.</p>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <Link href="/privacy" className="hover:text-slate-900 transition">Privacy</Link>
          <Link href="/termini" className="hover:text-slate-900 transition">Termini di servizio</Link>
          <Link href="/regole" className="hover:text-slate-900 transition">Regole di scambio</Link>
        </div>

        <p className="text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Zena &amp; Go. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
