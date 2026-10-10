'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Annuncio {
  id: number;
  titolo: string;
  prezzo: number;
  quartiere: string;
  immagini?: string[];
  created_at: string;
}

interface Conversazione {
  id: string;
  annuncio_id: number;
  compratore_id: string;
  venditore_id: string;
  created_at: string;
  annunci?: {
    titolo: string;
    prezzo: number;
    quartiere: string;
    immagini?: string[];
  };
}

export default function ProfiloPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'annunci' | 'messaggi'>('annunci');
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [mieiAnnunci, setMieiAnnunci] = useState<Annuncio[]>([]);
  const [mieConversazioni, setMieConversazioni] = useState<Conversazione[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    const caricaProfilo = async () => {
      setCaricamento(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const uid = session.user.id;
      const nick = session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'Genovese';
      setUserId(uid);
      setNickname(nick);
      setEmail(session.user.email || '');

      // 1. Carica gli annunci creati dall'utente
      const { data: annunciData } = await supabase
        .from('annunci')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (annunciData) {
        setMieiAnnunci(annunciData as Annuncio[]);
      }

      // 2. Carica tutte le chat dell'utente (sia come compratore sia come venditore)
      const { data: convData } = await supabase
        .from('conversazioni')
        .select('*, annunci(titolo, prezzo, quartiere, immagini)')
        .or(`compratore_id.eq.${uid},venditore_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (convData) {
        setMieConversazioni(convData as Conversazione[]);
      }

      setCaricamento(false);
    };

    caricaProfilo();
  }, [router]);

  const disconnetti = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('zena_user_id');
    localStorage.removeItem('zena_nickname');
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            ← Torna alla bacheca
          </Link>
          <span className="font-bold text-slate-900 text-sm">Il tuo Profilo Zena &amp; Go</span>
          <button
            onClick={disconnetti}
            className="text-xs text-red-600 hover:text-red-700 font-semibold"
          >
            Esci
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Scheda Utente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-black">
              {nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">{nickname}</h1>
              <p className="text-xs text-slate-500">{email}</p>
              <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                Membro di Zena &amp; Go
              </span>
            </div>
          </div>

          <Link
            href="/pubblica"
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            <span>+</span>
            <span>Nuovo Annuncio</span>
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setTab('annunci')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${
              tab === 'annunci' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            I Miei Annunci ({mieiAnnunci.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('messaggi')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${
              tab === 'messaggi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Le Mie Chat ({mieConversazioni.length})
          </button>
        </div>

        {caricamento ? (
          <div className="text-center py-12 text-xs text-slate-400">Caricamento in corso...</div>
        ) : tab === 'annunci' ? (
          <div>
            {mieiAnnunci.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm mx-auto">
                <span className="text-3xl block mb-2">📦</span>
                <p className="font-bold text-sm text-slate-800 mb-1">Nessun annuncio pubblicato</p>
                <p className="text-xs text-slate-500 mb-4">Hai oggetti, collezioni o libri da scambiare?</p>
                <Link
                  href="/pubblica"
                  className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Pubblica ora
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mieiAnnunci.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="aspect-4/3 bg-slate-100 relative">
                      {item.immagini && item.immagini.length > 0 ? (
                        <img src={item.immagini[0]} alt={item.titolo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Nessuna foto</div>
                      )}
                      <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs font-black px-2 py-0.5 rounded-md">
                        {item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-xs text-slate-900 truncate">{item.titolo}</p>
                      <p className="text-[11px] text-slate-500">📍 {item.quartiere}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {mieConversazioni.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm mx-auto">
                <span className="text-3xl block mb-2">💬</span>
                <p className="font-bold text-sm text-slate-800 mb-1">Nessun messaggio attivo</p>
                <p className="text-xs text-slate-500">Quando contatti un venditore o qualcuno scrive a te, la conversazione apparirà qui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mieConversazioni.map((conv) => {
                  const sonoVenditore = conv.venditore_id === userId;
                  return (
                    <Link
                      key={conv.id}
                      href="/chat"
                      className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-3 flex items-center gap-3 transition shadow-2xs block"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        {conv.annunci?.immagini?.[0] ? (
                          <img src={conv.annunci.immagini[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {conv.annunci?.titolo || 'Annuncio'}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            sonoVenditore ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sonoVenditore ? 'Tua vendita' : 'Tuo acquisto'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {conv.annunci?.quartiere} • {conv.annunci?.prezzo === 0 ? 'Gratis' : `${conv.annunci?.prezzo} €`}
                        </p>
                      </div>
                      <span className="text-emerald-600 text-xs font-bold">Apri chat →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
