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
  // Centro & Collina
  'Centro Storico / Caruggi',
  'Porto Antico / Molo',
  'San Vincenzo / Piazza De Ferrari',
  'Castelletto / Spianata',
  'Carignano',
  'Manin / Circonvallazione a Monte',
  'Oregina / Lagaccio',
  'Principe / Dinegro',

  // Levante & Mare
  'Foce',
  'Albaro',
  'San Giuliano / Corso Italia',
  'Boccadasse',
  'San Martino',
  'Sturla',
  'Quarto dei Mille',
  'Quinto al Mare',
  'Nervi / Sant\'Ilario',
  'Apparizione / Borgoratti',
  'Bavari / San Desiderio',

  // Ponente
  'Sampierdarena',
  'San Teodoro',
  'Cornigliano',
  'Campi / Coronata',
  'Sestri Ponente',
  'Borzoli',
  'Multedo',
  'Pegli',
  'Pra\'',
  'Voltri',
  'Crevari',

  // Val Bisagno
  'Marassi / Stadio',
  'San Fruttuoso',
  'Quezzi / Fereggiano',
  'Staglieno',
  'Molassana',
  'Struppa / Prato',

  // Val Polcevera
  'Rivarolo / Certosa',
  'Fegino / Trasta',
  'Bolzaneto',
  'Morego / San Quirico',
  'Pontedecimo',
];

export default function Home() {
  const router = useRouter();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [sessioneUtente, setSessioneUtente] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [filtroQuartiere, setFiltroQuartiere] = useState('Tutti i quartieri');
  const [ricerca, setRicerca] = useState('');

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

    return matchQuartiere && matchRicerca;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Header Genova Blu & Ardesia */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Zena <span className="text-blue-800">&amp;</span> Go
            </span>
            <span className="hidden sm:inline-block text-[11px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {sessioneUtente ? (
              <>
                <Link
                  href="/profilo"
