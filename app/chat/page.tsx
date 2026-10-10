'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  created_at: string;
  annunci?: {
    titolo: string;
    prezzo: number;
    quartiere: string;
    immagini?: string[];
  };
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversazioneIdParam = searchParams.get('id');

  const [mioId, setMioId] = useState<string>('');
  const [conversazioni, setConversazioni] = useState<Conversazione[]>([]);
  const [conversazioneAttiva, setConversazioneAttiva] = useState<Conversazione | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [nuovoTesto, setNuovoTesto] = useState('');
  const [caricamento, setCaricamento] = useState(true);

  // Mappa dei profili per visualizzare i nickname
  const [profiliMap, setProfiliMap] = useState<Record<string, string>>({});

  // Gestione Sicurezza: Blocco e Segnalazione
  const [menuSicurezzaAperto, setMenuSicurezzaAperto] = useState(false);
  const [modalSegnalaAperto, setModalSegnalaAperto] = useState(false);
  const [motivoSegnalazione, setMotivoSegnalazione] = useState('Comportamento scorretto');
  const [dettaglioSegnalazione, setDettaglioSegnalazione] = useState('');
  const [segnalazioneInviata, setSegnalazioneInviata] = useState(false);
  const [utentiBloccati, setUtentiBloccati] = useState<string[]>([]);

  const fineMessaggiRef = useRef<HTMLDivElement>(null);

  // 1. Caricamento utente e inizializzazione blocchi
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirect=/chat');
        return;
      }
      const uid = session.user.id;
      setMioId(uid);

      // Carica blocchi salvati localmente
      const salvati = localStorage.getItem(`zena_bloccati_${uid}`);
      if (salvati) {
        try {
          setUtentiBloccati(JSON.parse(salvati));
        } catch {
          setUtentiBloccati([]);
        }
      }

      await caricaConversazioni(uid);
      setCaricamento(false);
    };

    init();
  }, [router]);

  // 2. Caricamento conversazioni e recupero nickname
  const caricaConversazioni = async (uid: string) => {
    const { data: convData, error } = await supabase
      .from('conversazioni')
      .select('*, annunci(titolo, prezzo, quartiere, immagini)')
      .or(`compratore_id.eq.${uid},venditore_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error || !convData) return;

    setConversazioni(convData as Conversazione[]);

    // Recupera tutti gli ID delle controparti
    const idsToFetch = new Set<string>();
    convData.forEach((c) => {
      if (c.compratore_id && c.compratore_id !== uid) idsToFetch.add(c.compratore_id);
      if (c.venditore_id && c.venditore_id !== uid) idsToFetch.add(c.venditore_id);
    });

    if (idsToFetch.size > 0) {
      const { data: profData } = await supabase
        .from('profili')
        .select('id, nickname')
        .in('id', Array.from(idsToFetch));

      if (profData) {
        const mappa: Record<string, string> = {};
        profData.forEach((p) => {
          if (p.id && p.nickname) mappa[p.id] = p.nickname;
        });
        setProfiliMap(mappa);
      }
    }

    // Seleziona conversazione attiva se indicata nel parametro URL o prima della lista
    if (conversazioneIdParam) {
      const trovata = convData.find((c) => String(c.id) === conversazioneIdParam);
      if (trovata) {
        setConversazioneAttiva(trovata);
        return;
      }
    }

    if (convData.length > 0 && !conversazioneAttiva) {
      setConversazioneAttiva(convData[0]);
    }
  };

  // 3. Caricamento messaggi per la conversazione selezionata
  useEffect(() => {
    if (!conversazioneAttiva) {
      setMessaggi([]);
      return;
    }

    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from('messaggi')
        .select('*')
        .eq('conversazione_id', conversazioneAttiva.id)
        .order('created_at', { ascending: true });

      if (data) {
        setMessaggi(data as Messaggio[]);
        setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    caricaMessaggi();

    // Sottoscrizione realtime ai messaggi se attiva in Supabase
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
          setMessaggi((prev) => [...prev, payload.new as Messaggio]);
          setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversazioneAttiva]);

  // Identificazione dell'interlocutore
  const idControparte = conversazioneAttiva
    ? conversazioneAttiva.compratore_id === mioId
      ? conversazioneAttiva.venditore_id
      : conversazioneAttiva.compratore_id
    : '';

  const nicknameControparte = idControparte
    ? profiliMap[idControparte] || `Utente_${idControparte.slice(0, 5)}`
    : 'Utente Zena & Go';

  const utenteAttualeBloccato = utentiBloccati.includes(idControparte);

  const inviaMessaggio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoTesto.trim() || !conversazioneAttiva || utenteAttualeBloccato) return;

    const payload = {
      conversazione_id: conversazioneAttiva.id,
      mittente_id: mioId,
      testo: nuovoTesto.trim(),
    };

    setNuovoTesto('');

    const { data, error } = await supabase.from('messaggi').insert(payload).select().single();
    if (!error && data) {
      setMessaggi((prev) => [...prev, data as Messaggio]);
      setTimeout(() => fineMessaggiRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const bloccaUtente = async () => {
    if (!idControparte) return;
    const nuovaLista = [...utentiBloccati, idControparte];
    setUtentiBloccati(nuovaLista);
    localStorage.setItem(`zena_bloccati_${mioId}`, JSON.stringify(nuovaLista));

    // Salva sul DB se la tabella esiste
    try {
      await supabase.from('blocchi_utenti').insert({
        bloccante_id: mioId,
        bloccato_id: idControparte,
      });
    } catch {
      // Ignora se non presente la tabella
    }

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
    } catch {
      // Fallback
    }

    setSegnalazioneInviata(true);
    setTimeout(() => {
      setSegnalazioneInviata(false);
      setModalSegnalaAperto(false);
      setMenuSicurezzaAperto(false);
      setDettaglioSegnalazione('');
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header generale */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            ← Bacheca Zena &amp; Go
          </Link>
          <span className="font-extrabold text-slate-900 text-sm">Messaggi &amp; Trattative</span>
          <Link href="/profilo" className="text-xs text-slate-500 hover:text-slate-800">
            Profilo
          </Link>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-3 sm:p-6 flex-1 flex flex-col md:flex-row gap-4 h-[calc(100vh-64px)]">
        {/* Barra laterale: Elenco Conversazioni */}
        <aside className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden shrink-0">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Le tue conversazioni</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {caricamento ? (
              <p className="p-4 text-xs text-slate-400 text-center">Caricamento chat...</p>
            ) : conversazioni.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nessuna conversazione attiva.<br />
                Scrivi a un annuncio per avviare uno scambio!
              </div>
            ) : (
              conversazioni.map((c) => {
                const partnerId = c.compratore_id === mioId ? c.venditore_id : c.compratore_id;
                const partnerNick = profiliMap[partnerId] || `Utente_${partnerId.slice(0, 5)}`;
                const isSelected = conversazioneAttiva?.id === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setConversazioneAttiva(c)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-slate-600">
                      {c.annunci?.immagini?.[0] ? (
                        <img src={c.annunci.immagini[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        partnerNick.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate">{partnerNick}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {c.annunci?.prezzo === 0 ? 'Gratis' : `${c.annunci?.prezzo} €`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{c.annunci?.titolo || 'Trattativa'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Finestra Chat Attiva */}
        <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden relative">
          {conversazioneAttiva ? (
            <>
              {/* Header Chat: Trasparenza & Nickname */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {nicknameControparte.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{nicknameControparte}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                        {conversazioneAttiva.venditore_id === mioId ? 'Acquirente' : 'Venditore'}
                      </span>
                    </div>
                    {conversazioneAttiva.annuncio_id && (
                      <Link
                        href={`/annuncio/${conversazioneAttiva.annuncio_id}`}
                        className="text-[11px] text-emerald-700 hover:underline truncate block"
                      >
                        Annuncio: <strong>{conversazioneAttiva.annunci?.titolo || 'Dettagli'}</strong> (
                        {conversazioneAttiva.annunci?.quartiere})
                      </Link>
                    )}
                  </div>
                </div>

                {/* Menu a 3 puntini: Segnala & Blocca */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuSicurezzaAperto(!menuSicurezzaAperto)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                    title="Opzioni sicurezza"
                  >
                    ⋮
                  </button>

                  {menuSicurezzaAperto && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 text-xs">
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
                          className="w-full text-left px-3 py-2 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
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

              {/* Banner Sicurezza Scambio a Mano */}
              <div className="bg-amber-50/70 border-b border-amber-200/60 px-3 py-1.5 text-[11px] text-amber-900 flex items-center justify-between">
                <span>🛡️ <strong>Regola di Zena:</strong> scambio sempre di persona in un luogo pubblico del quartiere.</span>
              </div>

              {/* Area Messaggi */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                {messaggi.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Inizia la conversazione! Accordati per orario e punto di incontro a Genova.
                  </div>
                ) : (
                  messaggi.map((m) => {
                    const isMio = m.mittente_id === mioId;
                    return (
                      <div key={m.id} className={`flex flex-col ${isMio ? 'items-end' : 'items-start'}`}>
                        {!isMio && (
                          <span className="text-[10px] text-slate-400 mb-0.5 ml-1">{nicknameControparte}</span>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isMio
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.testo}</p>
                          <span
                            className={`block text-[9px] mt-1 text-right ${
                              isMio ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={fineMessaggiRef} />
              </div>

              {/* Box Invio o Avviso Blocco */}
              {utenteAttualeBloccato ? (
                <div className="p-3 bg-red-50 border-t border-red-200 text-center text-xs text-red-700 flex items-center justify-center gap-2">
                  <span>🚫 Hai bloccato {nicknameControparte}.</span>
                  <button onClick={sbloccaUtente} className="underline font-bold hover:text-red-900">
                    Sblocca
                  </button>
                </div>
              ) : (
                <form onSubmit={inviaMessaggio} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                  <input
                    type="text"
                    value={nuovoTesto}
                    onChange={(e) => setNuovoTesto(e.target.value)}
                    placeholder={`Scrivi un messaggio a ${nicknameControparte}...`}
                    className="flex-1 text-xs sm:text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={!nuovoTesto.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    Invia
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-slate-400 text-xs">
              Seleziona una chat dalla lista per visualizzare i messaggi.
            </div>
          )}
        </section>
      </main>

      {/* Modal Segnalazione */}
      {modalSegnalaAperto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium text-center">
                ✓ Segnalazione inviata ai moderatori di Zena &amp; Go. Grazie per il contributo alla sicurezza!
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
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
