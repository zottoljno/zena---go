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
  const [immagini, setImmagini] = useState<string[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviato, setInviato] = useState(false);

  const inputStyle = {
    color: '#0f172a',
    backgroundColor: '#ffffff',
  };

  const gestisciFotoMultiple = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const spazioRimanente = 10 - immagini.length;
    const fileDaCaricare = fileArray.slice(0, spazioRimanente);

    fileDaCaricare.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImmagini((prev) => {
          if (prev.length >= 10) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const rimuoviFoto = (indice: number) => {
    setImmagini((prev) => prev.filter((_, i) => i !== indice));
  };

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
          immagini,
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
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
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
                type="button"
                onClick={() => {
                  setTitolo('');
                  setPrezzo('');
                  setDescrizione('');
                  setLuogoRitiro('');
                  setContatto('');
                  setImmagini([]);
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
            {/* Sezione Caricamento Fino a 10 Foto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-800">
                  Foto dell&apos;oggetto ({immagini.length}/10)
                </label>
                <span className="text-xs text-slate-500 font-medium">Facoltativo, max 10</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {immagini.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={img} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => rimuoviFoto(index)}
                      className="absolute top-1 right-1 bg-black/75 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {immagini.length < 10 && (
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 rounded-xl cursor-pointer transition">
                    <span className="text-xl">📷</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Aggiungi</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={gestisciFotoMultiple}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Cosa vuoi vendere o regalare? *
              </label>
              <input
                type="text"
                required
                style={inputStyle}
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="es. Libro universitario, Bici da passeggio, Sedia..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Prezzo (€) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  style={inputStyle}
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  placeholder="0 se in regalo"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Quartiere / Zona *
                </label>
                <select
                  value={quartiere}
                  style={inputStyle}
                  onChange={(e) => setQuartiere(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  {QUARTIERI_GENOVA.map((q) => (
                    <option key={q} value={q} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Punto d&apos;incontro suggerito
              </label>
              <input
                type="text"
                style={inputStyle}
                value={luogoRitiro}
                onChange={(e) => setLuogoRitiro(e.target.value)}
                placeholder="es. Piazza De Ferrari, Stazione Brignole, via XX Settembre..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Descrizione dell&apos;oggetto
              </label>
              <textarea
                rows={3}
                style={inputStyle}
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Indica condizioni d'uso, difetti o dettagli utili..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Recapito per contatto (WhatsApp o Telegram) *
              </label>
              <input
                type="text"
                required
                style={inputStyle}
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
