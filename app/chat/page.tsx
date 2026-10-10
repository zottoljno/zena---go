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

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirect=/chat');
        return;
      }
      const uid = session.user.id;
      setMioId(uid);

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

  const caricaConversazioni = async (uid: string) => {
    const { data: convData, error } = await supabase
      .from('conversazioni')
      .select('*, annunci(titolo, prezzo, quartiere, immagini)')
      .or(`compratore_id.eq.${uid},venditore_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error || !convData) return;

    setConversazioni(convData as Conversazione[]);

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

    try {
      await supabase.from('blocchi_utenti').insert({
        bloccante_id: mioId,
        bloccato_id: idControparte,
      });
    } catch {
      // Fallback
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
                      isSelected ? 'bg-emerald-50/70 border
