'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const QUARTIERI_GENOVA = [
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

export default function PubblicaAnnuncio() {
  const [titolo, setTitolo] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [quartiere, setQuartiere] = useState(QUARTIERI_GENOVA[0]);
  const [descrizione, setDescrizione] = useState('');
  const [luogoRitiro, setLuogoRitiro] = useState('');
  const [contatto, setContatto] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviato, setInviato] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    try {
      const { error } = await supabase.from('annunci').insert([
        {
          titolo,
          prezzo: parseFloat(prezzo) || 0,
          quartiere,
          luogo_ritiro: luogoRitiro,
          descrizione,
          contatto,
        },
      ]);

      if (error) {
        throw error;
      }

      setInviato(true);
    } catch (err: any) {
      setErrore(err.message || 'Errore durante la pubblicazione.');
    } finally {
      setCaricamento(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Torna alla bacheca
          </Link>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
            Zena & Go
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Pubblica un annuncio</h1>
        <p className="text-sm text-slate-600 mb-6">
          Vendi o cedi a mano nel tuo quartiere a Genova. Niente spedizioni, solo scambio di persona.
        </p>

        {errore && (
          <div className="mb-5 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
            {errore}
          </div>
        )}

        {inviato ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <h2 className="text-lg font-semibold text-emerald-900 mb-1">Annuncio pubblicato!</h2>
            <p className="text-sm text-emerald-700 mb-4">
              L&apos;annuncio per &quot;{titolo}&quot; è stato registrato nel database.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setTitolo('');
                  setPrezzo('');
                  setDescrizione('');
                  setLuogoRitiro('');
                  setContatto('');
                  setInviato(false);
                }}
                className="text-sm text-emerald-800 font-medium px-4 py-2 hover:underline"
              >
                Pubblicane un altro
              </button>
              <Link
                href="/"
                className="inline-block bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                Vai alla home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cosa vuoi vendere o regalare? *
              </label>
              <input
                type="text"
                required
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="es. Libro universitario, Bici da passeggio, Sedia..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prezzo (€) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  placeholder="0 se in regalo"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quartiere / Zona *
                </label>
                <select
                  value={quartiere}
                  onChange={(e) => setQuartiere(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  {QUARTIERI_GENOVA.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Punto d&apos;incontro suggerito
              </label>
              <input
                type="text"
                value={luogoRitiro}
                onChange={(e) => setLuogoRitiro(e.target.value)}
                placeholder="es. Piazza De Ferrari, Stazione Brignole, via XX Settembre..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrizione dell&apos;oggetto
              </label>
              <textarea
                rows={3}
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Indica condizioni d'uso, difetti o dettagli utili..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Recapito per contatto (WhatsApp o Telegram) *
              </label>
              <input
                type="text"
                required
                value={contatto}
                onChange={(e) => setContatto(e.target.value)}
                placeholder="es. Numero WhatsApp o username Telegram"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={caricamento}
              className="w-full bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl hover:bg-emerald-700 transition shadow-sm"
            >
              {caricamento ? 'Pubblicazione in corso...' : 'Pubblica Annuncio a Genova'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
