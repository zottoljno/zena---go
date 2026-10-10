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
  luogo_ritiro?: string;
  descrizione?: string;
  immagini?: string[];
  created_at?: string;
  user_id?: string;
}

const QUARTIERI_GENOVA = [
  'Tutti i quartieri',
  'Centro Storico',
  'Carignano / Foce',
  'Albaro / San Martino',
  'Castelletto / Manin',
  'San Fruttuoso / Marassi',
  'Staglieno / Val Bisagno',
  'Sampierdarena / San Teodoro',
  'Cornigliano / Sestri Ponente',
  'Pegli / Pra\' / Voltri',
  'Quarto / Quinto / Nervi',
  'Pontedecimo / Bolzaneto / Val Polcevera',
];

export default function Home() {
  const router = useRouter();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [sessioneUtente, setSessioneUtente] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [filtroQuartiere, setFiltroQuartiere] = useState('Tutti i quartieri');
  const [ricerca, setRicerca] = useState('');
  const [soloRegalo, setSoloRegalo] = useState(false);

  useEffect(() => {
    const controllaSessione = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessioneUtente(session.user);
        const nick = session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'Genovese';
        setNickname(nick);
        localStorage.setItem('zena_user_id', session.user.id);
        localStorage.setItem('zena_nickname', nick);
      }
    };

    controllaSessione();
    caricaAnnunci();
  }, []);

  const caricaAnnunci = async () => {
    setCaricamento(true);
    try {
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore nel recupero annunci:', error);
      } else if (data) {
        setAnnunci(data as Annuncio[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCaricamento(false);
    }
  };

  const handleAzioneProtetta = (destinazione: string) => {
    if (sessioneUtente) {
      router.push(destinazione);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(destinazione)}`);
    }
  };

  const disconnetti = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('zena_user_id');
    localStorage.removeItem('zena_nickname');
    setSessioneUtente(null);
    setNickname('');
  };

  const annunciFiltrati = annunci.filter((a) => {
    const matchQuartiere =
      filtroQuartiere === 'Tutti i quartieri' || a.quartiere === filtroQuartiere;
    const matchRicerca =
      !ricerca.trim() ||
      a.titolo.toLowerCase().includes(ricerca.toLowerCase()) ||
      (a.descrizione && a.descrizione.toLowerCase().includes(ricerca.toLowerCase()));
    const matchRegalo = !soloRegalo || a.prezzo === 0;

    return matchQuartiere && matchRicerca && matchRegalo;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">Zena &amp; Go</span>
            <span className="hidden sm:inline-block text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {sessioneUtente ? (
              <>
                <Link
                  href="/profilo"
                  className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <span>👤</span>
                  <span>{nickname}</span>
                </Link>

                <button
                  onClick={() => handleAzioneProtetta('/chat')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition border border-slate-200"
                >
                  <span>💬</span>
                  <span className="hidden sm:inline">Messaggi</span>
                </button>

                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
                >
                  <span>
                    
