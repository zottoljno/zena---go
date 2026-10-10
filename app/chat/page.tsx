'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Messaggio {
  id: string;
  conversazione_id: string;
  mittente_id: string;
  testo: string;
  created_at: string;
}

interface Conversazione {
  id: string;
  annuncio_id: number;
  compratore_id: string;
  venditore_id: string;
  annunci?: {
    titolo: string;
    prezzo: number;
    quartiere: string;
    immagini?: string[];
  };
}

function ChatContent() {
  const searchParams = useSearchParams();
  const annuncioParam = searchParams.get('annuncioId');
  const venditoreParam = searchParams.get('venditore');

  const [mioId, setMioId] = useState<string>('');
  const [mioNickname, setMioNickname] = useState<string>('');
  const [conversazioni, setConversazioni] = useState<Conversazione[]>([]);
  const [chatSelezionata, setChatSelezionata] = useState<Conversazione | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [nuovoTesto, setNuovoTesto] = useState('');
  const [caricamento, setCaricamento] = useState(true);

  const messaggiEndRef = useRef<HTMLDivElement>(null);

  // Inizializza utente locale
  useEffect(() => {
    let id = localStorage.getItem('zena_user_id');
    let nick = localStorage.getItem('zena_nickname');

    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('zena_user_id', id);
    }
    if (!nick) {
      nick = prompt('Scegli un Nickname per messaggiare su Zena & Go:') || 'Genovese_' + id.substring(5, 8);
      localStorage.setItem('zena_nickname', nick);
    }

    setMioId(id);
    setMioNickname(nick);
  }, []);

  // Gestione conversazioni
  useEffect(() => {
    if (!mioId) return;

    const inizializzaChat = async () => {
      setCaricamento(true);

      if (annuncioParam && venditoreParam && venditoreParam !== mioId) {
        const { data: convEsistente } = await supabase
          .from('conversazioni')
          .select('*, annunci(titolo, prezzo, quartiere, immagini)')
          .eq('annuncio_id', annuncioParam)
          .eq('compratore_id', mioId)
          .maybeSingle();

        if (convEsistente) {
          setChatSelezionata(convEsistente as any);
        } else {
          const { data: nuovaConv } = await supabase
            .from('conversazioni')
            .insert([
              {
                annuncio_id: Number(annuncioParam),
                compratore_id: mioId,
                venditore_id: venditoreParam,
              },
            ])
            .select('*, annunci(titolo, prezzo, quartiere, immagini)')
            .single();

          if (nuovaConv) {
            setChatSelezionata(nuovaConv as any);
          }
        }
      }

      const { data } = await supabase
        .from('conversazioni')
        .select('*, annunci(titolo, prezzo, quartiere, immagini)')
        .or(`compratore_id.eq.${mioId},venditore_id.eq.${mioId}`)
        .order('created_at', { ascending: false });

      if (data) {
        setConversazioni(data as any);
        if (!chatSelezionata && data.length > 0 && !annuncioParam) {
          setChatSelezionata(data[0] as any);
        }
      }

      setCaricamento(false);
    };

    inizializzaChat();
  }, [mioId, annuncioParam, venditoreParam]);

  // Messaggi e Realtime
  useEffect(() => {
    if (!chatSelezionata) return;

    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from('messaggi')
        .select('*')
        .eq('conversazione_id', chatSelezionata.id)
        .order('created_at', { ascending: true });

      if (data) setMessaggi(data);
    };

    caricaMessaggi();

    const channel = supabase
      .channel(`chat_${chatSelezionata.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaggi',
          filter: `conversazione_id=eq.${chatSelezionata.id}`,
        },
        (payload) => {
          setMessaggi((prev) => [...prev, payload.new as Messaggio]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatSelezionata]);

  useEffect(() => {
    messaggiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi]);

  const inviaMessaggio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoTesto.trim() || !chatSelezionata || !mioId) return;

    const testoDaInviare = nuovoTesto.trim();
    setNuovoTesto('');

    const { error } = await supabase.from('messaggi').insert([
      {
        conversazione_id: chatSelezionata.id,
        mittente_id: mioId,
        testo: testoDaInviare,
      },
    ]);

    if (error) {
      alert("Errore nell'invio: " + error.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Bacheca
          </Link>
          <span className="font-bold text-slate-900 text-base">Messaggi Zena &amp; Go</span>
        </div>
        <div className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          👤 Tu: <strong className="text-slate-800">{mioNickname || 'Ospite'}</strong>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-6xl w-full mx-auto bg-white border-x border-slate-200">
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-3 border-b border-slate-200 font-semibold text-xs text-slate-500 uppercase tracking-wider">
            Conversazioni
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {caricamento ? (
              <div className="p-4 text-xs text-slate-400 text-center">Caricamento...</div>
            ) : conversazioni.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                Nessuna conversazione attiva.
              </div>
            ) : (
              conversazioni.map((conv) => {
                const attivo = chatSelezionata?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setChatSelezionata(conv)}
                    className={`w-full text-left p-3 flex gap-3 items-center transition ${
                      attivo ? 'bg-white shadow-xs border-l-4 border-emerald-600' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0 overflow-hidden">
                      {conv.annunci?.immagini?.[0] ? (
                        <img src={conv.annunci.immagini[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {conv.annunci?.titolo || 'Annuncio'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        📍 {conv.annunci?.quartiere || 'Genova'} • {conv.annunci?.prezzo === 0 ? 'Gratis' : `${conv.annunci?.prezzo} €`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50/50">
          {chatSelezionata ? (
            <>
              {chatSelezionata.annunci && (
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{chatSelezionata.annunci.titolo}</p>
                    <p className="text-[11px] text-slate-500">
                      Scambio a mano: <strong>{chatSelezionata.annunci.quartiere}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    {chatSelezionata.annunci.prezzo === 0 ? 'Gratis' : `${chatSelezionata.annunci.prezzo} €`}
                  </span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messaggi.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 mt-8">
                    Invia un messaggio per concordare luogo e ora dello scambio a Genova!
                  </div>
                ) : (
                  messaggi.map((m) => {
                    const sonoIo = m.mittente_id === mioId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${sonoIo ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs leading-relaxed ${
                            sonoIo
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                          }`}
                        >
                          {m.testo}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messaggiEndRef} />
              </div>

              <form onSubmit={inviaMessaggio} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={nuovoTesto}
                  onChange={(e) => setNuovoTesto(e.target.value)}
                  placeholder="Scrivi un messaggio per accordarti..."
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                >
                  Invia
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Seleziona una conversazione per iniziare a chattare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500">Caricamento chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
