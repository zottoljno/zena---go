'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [filtroQuartiere, setFiltroQuartiere] = useState('Tutti i quartieri');
  const [ricerca, setRicerca] = useState('');
  const [soloRegalo, setSoloRegalo] = useState(false);

  useEffect(() => {
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">Zena &amp; Go</span>
            <span className="hidden sm:inline-block text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl transition border border-slate-200"
            >
              <span>💬</span>
              <span>I Miei Messaggi</span>
            </Link>

            <Link
              href="/pubblica"
              className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition shadow-xs"
            >
              <span>+</span>
              <span>Pubblica</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Filtri */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Scambia, regala e fai affari nel tuo quartiere a Genova
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Chatta direttamente sul sito senza condividere il tuo numero di telefono privato.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              placeholder="Cosa stai cercando? (es. libri, fotocamera, giacca...)"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="sm:col-span-2 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <select
              value={filtroQuartiere}
              onChange={(e) => setFiltroQuartiere(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="text-xs border border-slate-300 rounded-xl px-
