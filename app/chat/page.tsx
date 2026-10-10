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

  const [profiliMap, setProfiliMap] = useState<Record<string, string>>({});

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
      // Ignora errore se tabella non creata
    }

    setMenuSicurezzaAperto(false);
  };

  const sbloccaUtente = () => {
    const nuovaLista = utentiBloccati.filter((id) => id !== idControparte);
    setUtentiBloccati(nuovaLista);
    localStorage.setItem(`zena_bloccati_${mioId}`, JSON.stringify(nuovaLista));
    setMenu
