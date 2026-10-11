'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Messaggio {
  id: string;
  conversazione_id: string;
  mittente_id: string;
  testo: string;
  letto?: boolean;
  created_at: string;
}

interface Conversazione {
  id: string;
  annuncio_id: number;
  compratore_id: string;
  venditore_id: string;
  created_at: string;
  non_letti?: number;
  annunci?: {
    titolo: string;
    prezzo: number;
    quartiere: string;
    immagini?: string[];
  };
}

const RISPOSTE_RAPIDE = [
  'Ciao! È ancora disponibile?',
  'Ci vediamo in Piazza De Ferrari?',
  'Possiamo vederci a Brignole?',
  'A che ora sei libero per lo scambio?',
  'Perfetto, ci vediamo lì!',
];

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversazioneIdParam = searchParams.get('id');

  const [mioId, setMioId] = useState<string>('');
  const [conversazioni, setConversazioni] = useState<Conversazione[]>([]);
  const [conversazioneAttiva, setConversazioneAttiva] = useState<Conversazione | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [nuovoTesto, setNuovoTesto] = useState('');
  const [caricamento, setCaricamento] = useState(true);

  const [profiliMap, setProfiliMap] = useState<Record<string, string>>({});
  const [menuSicurezzaAperto, setMenuSicurezzaAperto] = useState(false);
  const [modalSegnalaAperto, setModalSegnalaAperto] = useState(false);
  const [motivoSegnalazione, setMotivoSegnalazione] = useState('Comportamento scorretto');
  const [dettaglioSegnalazione, setDettaglioSegnalazione] = useState('');
  const [segnalazioneInviata, setSegnalazioneInviata] = useState(false);
  const [utentiBloccati, setUtentiBloccati] = useState<string[]>([]);
  const [vistaMobile, setVistaMobile] = useState<'lista' | 'chat'>('lista');

  const fineMessaggiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let montato = true;

    const inizializza = async () => {
      // 1. Sessione utente
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirect=/chat');
        return;
      }

      const uid = session.user.id;
      if (montato) setMioId(uid);

      // Bloccati locali
      const salvati = localStorage.getItem(`zena_bloccati_${uid}`);
      if (salvati) {
        try {
          setUtentiBloccati(JSON.parse(salvati));
        } catch {}
      }

      // 2. Chiamata veloce in parallelo
      await caricaConversazioni(uid);
      if (montato) setCaricamento(false);
    };

    inizializza();

    return () => {
      montato = false;
    };
  }, [router]);

  const caricaConversazioni = async (uid: string) => {
    try {
      // Due query mirate in parallelo: sfruttano gli indici ed evitano la lentezza del .or()
      const [resCompratore, resVenditore] = await Promise.all([
        supabase
          .from('conversazioni')
          .select('id, annuncio_id, compratore_id, venditore_id, created_at, annunci(titolo, prezzo, quartiere, immagini)')
          .eq('compratore_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversazioni')
          .select('id, annuncio_id, compratore_id, venditore_id, created_at, annunci(titolo, prezzo, quartiere, immagini)')
          .eq('venditore_id', uid)
          .order('created_at', { ascending: false }),
      ]);

      const lista = [
        ...(resCompratore.data || []),
        ...(resVenditore.data || []),
      ] as unknown as Conversazione[];

      // Elimina eventuali duplicati e ordina per data
      const convUniche = Array.from(new Map(lista.map((c) => [c.id, c])).values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setConversazioni(convUniche);

      if (conversazioneIdParam) {
        const trovata = convUniche.find((c) => String(c.id) === conversazioneIdParam);
        if (trovata) {
          setConversazioneAttiva(trovata);
          setVistaMobile('chat');
        }
      } else if (convUniche.length > 0 && !conversazioneAttiva) {
        setConversazioneAttiva(convUniche[0]);
      }

      // Recupera i nickname senza bloccare l'interfaccia
      const idsToFetch = new Set<string>();
      convUniche.forEach((c) => {
        if (c.compratore_id && c.compratore_id !== uid) idsToFetch.add(c.compratore_id);
        if (c.venditore_id && c.venditore_id !== uid) idsToFetch.add(c.venditore_id);
      });

      if (idsToFetch.size > 0) {
        supabase
          .from('profili')
          .select('id, nickname')
          .in('id', Array.from(idsToFetch))
          .then(({ data: profData }) => {
            if (profData) {
              const mappa: Record<string, string> = {};
              profData.forEach((p) => {
                if (p.id && p.nickname) mappa[p.id] = p.nickname;
              });
              setProfiliMap((prev) => ({ ...prev, ...mappa }));
            }
          });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCaricamento(false);
    }
  };

  // Caricamento messaggi della chat attiva
  useEffect(() => {
    if (!conversazioneAttiva || !mioId) {
      setMessaggi([]);
      return;
    }

    let isSubscribed = true;

    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from('messaggi')
        .select('*')
        .eq('conversazione_id', conversazioneAttiva.id)
        .order('created_at', { ascending: true });

      if (data && isSubscribed) {
        const msgs = data as Messaggio[];
        setMessaggi(msgs);
        setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'auto' }), 10);

        // Segna come letti in background
        const daLeggere = msgs.some((m) => m.mittente_id !== mioId && !m.letto);
        if (daLeggere) {
          supabase
            .from('messaggi')
            .update({ letto: true })
            .eq('conversazione_id', conversazioneAttiva.id)
            .neq('mittente_id', mioId)
            .eq('letto', false)
            .then(() => {});
        }
      }
    };

    caricaMessaggi();

    const channel = supabase
      .channel(`chat_${conversazioneAttiva.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaggi',
          filter: `conversazione_id=eq.${conversazioneAttiva.id}`,
        },
        (payload) => {
          const nuovoMsg = payload.new as Messaggio;
          setMessaggi((prev) => {
            if (
              prev.some(
                (m) =>
                  m.id === nuovoMsg.id ||
                  (m.mittente_id === nuovoMsg.mittente_id &&
                    m.testo === nuovoMsg.testo &&
                    m.id.startsWith('temp-'))
              )
            ) {
              return prev.map((m) =>
                m.testo === nuovoMsg.testo && m.id.startsWith('temp-') ? nuovoMsg : m
              );
            }
            return [...prev, nuovoMsg];
          });
          setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [conversazioneAttiva?.id, mioId]);

  const idControparte = conversazioneAttiva
    ? conversazioneAttiva.compratore_id === mioId
      ? conversazioneAttiva.venditore_id
      : conversazioneAttiva.compratore_id
    : '';

  const nicknameControparte = idControparte
    ? profiliMap[idControparte] || `Genovese_${idControparte.slice(0, 4)}`
    : 'Utente Zena & Go';

  const utenteAttualeBloccato = utentiBloccati.includes(idControparte);

  const inviaMessaggio = async (e?: React.FormEvent, testoParam?: string) => {
    if (e) e.preventDefault();
    const testo = (testoParam || nuovoTesto).trim();
    if (!testo || !conversazioneAttiva || utenteAttualeBloccato) return;

    const tempId = `temp-${Date.now()}`;
    const messaggioProvvisorio: Messaggio = {
      id: tempId,
      conversazione_id: conversazioneAttiva.id,
      mittente_id: mioId,
      testo: testo,
      letto: false,
      created_at: new Date().toISOString(),
    };

    setMessaggi((prev) => [...prev, messaggioProvvisorio]);
    setNuovoTesto('');
    setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);

    const { data, error } = await supabase
      .from('messaggi')
      .insert({
        conversazione_id: conversazioneAttiva.id,
        mittente_id: mioId,
        testo: testo,
        letto: false,
      })
      .select()
      .single();

    if (data) {
      setMessaggi((prev) =>
        prev.map((m) => (m.id === tempId ? (data as Messaggio) : m))
      );
    } else if (error) {
      console.error('Errore invio messaggio:', error);
    }
  };

  const bloccaUtente = async () => {
    if (!idControparte) return;
    const nuovaLista = [...utentiBloccati, idControparte];
    setUtentiBloccati(nuovaLista);
    localStorage.setItem(`zena_bloccati_${mioId}`, JSON.stringify(nuovaLista));

    try {
      await supabase.from('blocchi_utenti').insert({
        bloccante_id: mioId,
        bloccato_id: idControparte,
      });
    } catch {}

    setMenuSicurezzaAperto(false);
  };

  const sbloccaUtente = () => {
    const nuovaLista = utentiBloccati.filter((id) => id !== idControparte);
    setUtentiBloccati(nuovaLista);
    localStorage.setItem(`zena_bloccati_${mioId}`, JSON.stringify(nuovaLista));
    setMenuSicurezzaAperto(false);
  };

  const inviaSegnalazione = async () => {
    if (!conversazioneAttiva || !idControparte) return;

    try {
      await supabase.from('segnalazioni').insert({
        segnalatore_id: mioId,
        segnalato_id: idControparte,
        conversazione_id: conversazioneAttiva.id,
        motivo: motivoSegnalazione,
        dettagli: dettaglioSegnalazione,
      });
    } catch {}

    try {
      fetch('/api/segnala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: motivoSegnalazione,
          dettagli: dettaglioSegnalazione,
          nicknameSegnalato: nicknameControparte,
          conversazioneId: conversazioneAttiva.id,
        }),
      }).catch((err) => console.error('Errore Telegram:', err));
    } catch {}

    setSegnalazioneInviata(true);
    setTimeout(() => {
      setSegnalazioneInviata(false);
      setModalSegnalaAperto(false);
      setMenuSicurezzaAperto(false);
      setDettaglioSegnalazione('');
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-sky-50/50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition"
          >
            <span>←</span>
            <span>Bacheca</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-slate-900 text-sm tracking-normal">
              Trattative &amp; Scambi
            </span>
          </div>

          <Link
            href="/profilo"
            className="text-xs font-medium text-slate-500 hover:text-blue-700 transition"
          >
            Mio Profilo
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-2 sm:p-4 flex-1 flex flex-col md:flex-row gap-3 h-[calc(100vh-57px)]">
        {/* Colonna Sinistra: Lista Chat */}
        <aside
          className={`w-full md:w-80 bg-white/95 rounded-2xl border border-sky-100 shadow-xs flex flex-col overflow-hidden shrink-0 transition-all ${
            vistaMobile === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-sky-100 bg-sky-50/40 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              Conversazioni ({conversazioni.length})
            </h2>
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Genova
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-sky-50">
            {caricamento ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Caricamento messaggi...</p>
              </div>
            ) : conversazioni.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <span className="text-3xl block">💬</span>
                <p className="font-semibold text-slate-600">Nessuna chat attiva</p>
                <p className="text-[11px] text-slate-400">
                  Scrivi a un annuncio per avviare uno scambio a mano nel quartiere!
                </p>
              </div>
            ) : (
              conversazioni.map((c) => {
                const partnerId = c.compratore_id === mioId ? c.venditore_id : c.compratore_id;
                const partnerNick = profiliMap[partnerId] || `Genovese_${partnerId.slice(0, 4)}`;
                const isSelected = conversazioneAttiva?.id === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setConversazioneAttiva(c);
                      setVistaMobile('chat');
                    }}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition relative group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-sky-50/50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-sky-700 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm shadow-xs relative">
                      {c.annunci?.immagini?.[0] ? (
                        <img src={c.annunci.immagini[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        partnerNick.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-blue-700 transition">
                          {partnerNick}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {c.annunci?.prezzo === 0 ? 'Gratis' : `${c.annunci?.prezzo} €`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-normal">
                        {c.annunci?.titolo || 'Trattativa in corso'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Colonna Destra: Finestra Chat */}
        <section
          className={`flex-1 bg-white rounded-2xl border border-sky-100 shadow-xs flex flex-col overflow-hidden relative ${
            vistaMobile === 'lista' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {conversazioneAttiva ? (
            <>
              {/* Header Chat */}
              <div className="p-3 border-b border-sky-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setVistaMobile('lista')}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                    title="Torna all'elenco"
                  >
                    ←
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-700 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {nicknameControparte.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {nicknameControparte}
                      </h3>
                      <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200/60 px-1.5 py-0.2 rounded font-medium">
                        {conversazioneAttiva.venditore_id === mioId ? 'Acquirente' : 'Venditore'}
                      </span>
                    </div>

                    {conversazioneAttiva.annuncio_id && (
                      <Link
                        href={`/annuncio/${conversazioneAttiva.annuncio_id}`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium truncate block flex items-center gap-1"
                      >
                        <span>📦</span>
                        <span className="truncate">{conversazioneAttiva.annunci?.titolo || 'Vedi annuncio'}</span>
                        <span className="text-slate-400">({conversazioneAttiva.annunci?.quartiere})</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Menu Sicurezza */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuSicurezzaAperto(!menuSicurezzaAperto)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-sky-50 rounded-xl transition font-bold text-sm cursor-pointer"
                    title="Opzioni sicurezza"
                  >
                    ⋮
                  </button>

                  {menuSicurezzaAperto && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-sky-100 py-1.5 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuSicurezzaAperto(false);
                          setModalSegnalaAperto(true);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-sky-50 flex items-center gap-2 cursor-pointer"
                      >
                        <span>🚩</span> Segnala utente
                      </button>

                      {utenteAttualeBloccato ? (
                        <button
                          type="button"
                          onClick={sbloccaUtente}
                          className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <span>🔓</span> Sblocca utente
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={bloccaUtente}
                          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <span>🚫</span> Blocca utente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Messaggi con Sfondo Azzurrino */}
              <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3 bg-gradient-to-b from-sky-50/70 via-sky-50/40 to-blue-50/30">
                <div className="bg-white/80 backdrop-blur-xs border border-sky-100 rounded-xl p-2 text-[11px] text-sky-900 flex items-center justify-center gap-1.5 text-center shadow-2xs">
                  <span>🛡️</span>
                  <span>
                    Accordo di scambio a Genova: accordatevi sempre in un luogo pubblico del quartiere.
                  </span>
                </div>

                {messaggi.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                    <p className="font-semibold text-slate-600">Nessun messaggio ancora.</p>
                    <p>Invia un messaggio o usa le risposte rapide qui sotto!</p>
                  </div>
                ) : (
                  messaggi.map((m) => {
                    const isMio = m.mittente_id === mioId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMio ? 'items-end' : 'items-start'}`}
                      >
                        {!isMio && (
                          <span className="text-[10px] text-slate-400 mb-0.5 ml-2 font-medium">
                            {nicknameControparte}
                          </span>
                        )}
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                            isMio
                              ? 'bg-blue-600 text-white rounded-2xl rounded-br-xs shadow-blue-500/10'
                              : 'bg-white text-slate-800 border border-sky-100/90 rounded-2xl rounded-bl-xs shadow-slate-200/40'
                          }`}
                        >
                          <p className="whitespace-pre-wrap font-normal">{m.testo}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isMio ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMio && (
                              <span className="font-bold">{m.letto ? '✓✓' : '✓'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={fineMessaggiRef} />
              </div>

              {/* Risposte Rapide */}
              {!utenteAttualeBloccato && (
                <div className="px-3 pt-2 pb-1.5 bg-white border-t border-sky-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {RISPOSTE_RAPIDE.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => inviaMessaggio(undefined, chip)}
                      className="whitespace-nowrap text-[11px] font-medium bg-sky-50/80 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-3 py-1 rounded-full border border-sky-100 transition shrink-0 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Invio Messaggio */}
              {utenteAttualeBloccato ? (
                <div className="p-3 bg-red-50 border-t border-red-200 text-center text-xs text-red-700 flex items-center justify-center gap-2">
                  <span>🚫 Hai bloccato {nicknameControparte}.</span>
                  <button onClick={sbloccaUtente} className="underline font-bold hover:text-red-900 cursor-pointer">
                    Sblocca
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => inviaMessaggio(e)}
                  className="p-2.5 sm:p-3 border-t border-sky-100 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={nuovoTesto}
                    onChange={(e) => setNuovoTesto(e.target.value)}
                    placeholder={`Scrivi a ${nicknameControparte}...`}
                    className="flex-1 text-xs sm:text-sm border border-sky-200/80 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-sky-50/40 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!nuovoTesto.trim()}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                    title="Invia"
                  >
                    ➤
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs space-y-2 bg-sky-50/30">
              <span className="text-4xl">💬</span>
              <p className="font-semibold text-slate-600">Nessuna conversazione selezionata</p>
              <p className="text-slate-400">Scegli una chat a sinistra per accordarti sullo scambio.</p>
            </div>
          )}
        </section>
      </main>

      {/* Modal Segnalazione */}
      {modalSegnalaAperto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Segnala {nicknameControparte}</h3>
              <button
                type="button"
                onClick={() => setModalSegnalaAperto(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {segnalazioneInviata ? (
              <div className="p-4 bg-blue-50 text-blue-900 text-xs rounded-xl font-medium text-center border border-blue-200">
                ✓ Segnalazione inviata ai moderatori di Zena &amp; Go.
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aiutaci a mantenere la community genovese sicura e affidabile.
                </p>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">Motivo</label>
                  <select
                    value={motivoSegnalazione}
                    onChange={(e) => setMotivoSegnalazione(e.target.value)}
                    className="w-full text-xs border border-sky-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Comportamento scorretto">Comportamento scorretto o offensivo</option>
                    <option value="Tentativo di truffa o pagamento sospetto">Tentativo di truffa o pagamento sospetto</option>
                    <option value="Oggetto non conforme o illegale">Oggetto non conforme o non corrispondente</option>
                    <option value="Mancata presentazione all'incontro">Mancata presentazione all'incontro concordato</option>
                    <option value="Spam">Spam o pubblicità indesiderata</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">Dettagli (facoltativo)</label>
                  <textarea
                    rows={3}
                    value={dettaglioSegnalazione}
                    onChange={(e) => setDettaglioSegnalazione(e.target.value)}
                    placeholder="Descrivi brevemente cosa è successo..."
                    className="w-full text-xs border border-sky-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalSegnalaAperto(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={inviaSegnalazione}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    Invia Segnalazione
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sky-50/50 flex items-center justify-center text-xs text-slate-400">
          Caricamento chat...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
