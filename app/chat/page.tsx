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

  // Per mobile: visualizzare la lista o la conversazione attiva
  const [vistaMobile, setVistaMobile] = useState<'lista' | 'chat'>('lista');

  const fineMessaggiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let montato = true;

    const init = async () => {
      const idLocale = typeof window !== 'undefined' ? localStorage.getItem('zena_user_id') : null;
      if (idLocale && montato) {
        setMioId(idLocale);
        const salvati = localStorage.getItem(`zena_bloccati_${idLocale}`);
        if (salvati) {
          try {
            setUtentiBloccati(JSON.parse(salvati));
          } catch {
            setUtentiBloccati([]);
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirect=/chat');
        return;
      }

      const uid = session.user.id;
      if (montato) setMioId(uid);

      await caricaConversazioni(uid);
      if (montato) setCaricamento(false);
    };

    init();

    return () => {
      montato = false;
    };
  }, [router]);

  const caricaConversazioni = async (uid: string) => {
    try {
      const { data: convData, error } = await supabase
        .from('conversazioni')
        .select('id, annuncio_id, compratore_id, venditore_id, created_at, annunci(titolo, prezzo, quartiere, immagini)')
        .or(`compratore_id.eq.${uid},venditore_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (error || !convData) {
        setConversazioni([]);
        return;
      }

      const convList = convData as unknown as Conversazione[];

      // Conteggio messaggi non letti per ciascuna chat
      const { data: messaggiNonLetti } = await supabase
        .from('messaggi')
        .select('conversazione_id')
        .neq('mittente_id', uid)
        .eq('letto', false);

      const conteggioMap: Record<string, number> = {};
      if (messaggiNonLetti) {
        messaggiNonLetti.forEach((m) => {
          conteggioMap[m.conversazione_id] = (conteggioMap[m.conversazione_id] || 0) + 1;
        });
      }

      const convConConteggi = convList.map((c) => ({
        ...c,
        non_letti: conteggioMap[c.id] || 0,
      }));

      setConversazioni(convConConteggi);

      // Recupera i nickname degli altri utenti
      const idsToFetch = new Set<string>();
      convList.forEach((c) => {
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
              setProfiliMap(mappa);
            }
          });
      }

      if (conversazioneIdParam) {
        const trovata = convConConteggi.find((c) => String(c.id) === conversazioneIdParam);
        if (trovata) {
          setConversazioneAttiva(trovata);
          setVistaMobile('chat');
          return;
        }
      }

      if (convConConteggi.length > 0 && !conversazioneAttiva) {
        setConversazioneAttiva(convConConteggi[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Caricamento messaggi + Realtime
  useEffect(() => {
    if (!conversazioneAttiva || !mioId) {
      setMessaggi([]);
      return;
    }

    let isSubscribed = true;

    const segnaComeLetti = async () => {
      await supabase
        .from('messaggi')
        .update({ letto: true })
        .eq('conversazione_id', conversazioneAttiva.id)
        .neq('mittente_id', mioId)
        .eq('letto', false);

      setConversazioni((prev) =>
        prev.map((c) => (c.id === conversazioneAttiva.id ? { ...c, non_letti: 0 } : c))
      );
    };

    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from('messaggi')
        .select('*')
        .eq('conversazione_id', conversazioneAttiva.id)
        .order('created_at', { ascending: true });

      if (data && isSubscribed) {
        setMessaggi(data as Messaggio[]);
        setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'auto' }), 10);
      }
      segnaComeLetti();
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
          if (nuovoMsg.mittente_id !== mioId) {
            segnaComeLetti();
          }
          setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [conversazioneAttiva, mioId]);

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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar compatta */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-slate-700 hover:text-blue-900 flex items-center gap-1.5 transition"
          >
            <span>←</span>
            <span>Bacheca</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-black text-slate-900 text-sm tracking-tight">
              Chat &amp; Scambi
            </span>
          </div>

          <Link
            href="/profilo"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            Mio Profilo
          </Link>
        </div>
      </header>

      {/* Main Container a 2 colonne */}
      <main className="max-w-6xl w-full mx-auto p-2 sm:p-4 flex-1 flex flex-col md:flex-row gap-3 h-[calc(100vh-57px)]">
        
        {/* Colonna Sinistra: Lista Chat */}
        <aside
          className={`w-full md:w-80 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0 transition-all ${
            vistaMobile === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-800 tracking-wide uppercase">
              I tuoi contatti ({conversazioni.length})
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold">Genova</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {caricamento ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Caricamento chat...</p>
              </div>
            ) : conversazioni.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <span className="text-3xl block">💬</span>
                <p className="font-semibold text-slate-600">Nessuna conversazione ancora</p>
                <p className="text-[11px] text-slate-400">
                  Scrivi a un annuncio in bacheca per iniziare uno scambio a mano!
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
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition relative group ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-blue-800'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-800 to-slate-900 text-white overflow-hidden shrink-0 flex items-center justify-center font-black text-sm shadow-xs relative">
                      {c.annunci?.immagini?.[0] ? (
                        <img src={c.annunci.immagini[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        partnerNick.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-900 transition">
                          {partnerNick}
                        </span>
                        {c.non_letti !== undefined && c.non_letti > 0 ? (
                          <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center">
                            {c.non_letti}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {c.annunci?.prezzo === 0 ? 'Gratis' : `${c.annunci?.prezzo} €`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {c.annunci?.titolo || 'Trattativa in corso'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Colonna Destra: Chat attiva */}
        <section
          className={`flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden relative ${
            vistaMobile === 'lista' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {conversazioneAttiva ? (
            <>
              {/* Header Conversazione Attiva */}
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white z-10 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Tasto indietro visibile su mobile */}
                  <button
                    type="button"
                    onClick={() => setVistaMobile('lista')}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
                    title="Torna all'elenco"
                  >
                    ←
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-800 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {nicknameControparte.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {nicknameControparte}
                      </h3>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {conversazioneAttiva.venditore_id === mioId ? 'Compratore' : 'Venditore'}
                      </span>
                    </div>

                    {conversazioneAttiva.annuncio_id && (
                      <Link
                        href={`/annuncio/${conversazioneAttiva.annuncio_id}`}
                        className="text-[11px] text-blue-800 hover:text-blue-900 font-semibold truncate block flex items-center gap-1"
                      >
                        <span>📦</span>
                        <span className="truncate">{conversazioneAttiva.annunci?.titolo || 'Vedi annuncio'}</span>
                        <span className="text-slate-400">({conversazioneAttiva.annunci?.quartiere})</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Menu Opzioni & Sicurezza */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuSicurezzaAperto(!menuSicurezzaAperto)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition font-black text-sm"
                    title="Opzioni sicurezza"
                  >
                    ⋮
                  </button>

                  {menuSicurezzaAperto && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuSicurezzaAperto(false);
                          setModalSegnalaAperto(true);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span>🚩</span> Segnala utente
                      </button>

                      {utenteAttualeBloccato ? (
                        <button
                          type="button"
                          onClick={sbloccaUtente}
                          className="w-full text-left px-3 py-2 text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-semibold"
                        >
                          <span>🔓</span> Sblocca utente
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={bloccaUtente}
                          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                        >
                          <span>🚫</span> Blocca utente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Messaggi */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 bg-slate-50/70">
                {/* Banner Scambio Sicuro compatto */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2 text-[11px] text-amber-900 flex items-center justify-center gap-1.5 text-center shadow-2xs">
                  <span>🛡️</span>
                  <span>
                    Accordo di scambio a Genova: incontratevi di persona in un luogo pubblico.
                  </span>
                </div>

                {messaggi.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                    <p className="font-semibold text-slate-600">Nessun messaggio ancora.</p>
                    <p>Invia un messaggio o tocca una delle risposte rapide qui sotto!</p>
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
                          <span className="text-[10px] text-slate-400 mb-0.5 ml-2 font-semibold">
                            {nicknameControparte}
                          </span>
                        )}
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isMio
                              ? 'bg-gradient-to-br from-blue-800 to-blue-900 text-white rounded-2xl rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.testo}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isMio ? 'text-blue-200' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMio && (
                              <span>{m.letto ? '✓✓' : '✓'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={fineMessaggiRef} />
              </div>

              {/* Risposte Rapide per Scambio a Genova */}
              {!utenteAttualeBloccato && (
                <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {RISPOSTE_RAPIDE.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => inviaMessaggio(undefined, chip)}
                      className="whitespace-nowrap text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 px-3 py-1 rounded-full border border-slate-200 transition shrink-0"
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
                  <button onClick={sbloccaUtente} className="underline font-bold hover:text-red-900">
                    Sblocca
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => inviaMessaggio(e)}
                  className="p-2.5 sm:p-3 border-t border-slate-200 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={nuovoTesto}
                    onChange={(e) => setNuovoTesto(e.target.value)}
                    placeholder={`Scrivi a ${nicknameControparte}...`}
                    className="flex-1 text-xs sm:text-sm border border-slate-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 bg-slate-50 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!nuovoTesto.trim()}
                    className="w-10 h-10 rounded-full bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white font-bold flex items-center justify-center transition shadow-xs shrink-0"
                    title="Invia"
                  >
                    ➤
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs space-y-2">
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Segnala {nicknameControparte}</h3>
              <button
                type="button"
                onClick={() => setModalSegnalaAperto(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
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
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
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
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalSegnalaAperto(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={inviaSegnalazione}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs"
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">
          Caricamento chat...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
