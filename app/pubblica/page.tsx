'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CATEGORIE = [
  { id: 'Fumetti & Manga', label: '📚 Fumetti & Manga' },
  { id: 'Videogiochi & Console', label: '🎮 Videogiochi & Console' },
  { id: 'Cinema & DVD', label: '🎬 Cinema & DVD' },
  { id: 'Collezionismo & LEGO', label: '🧱 Collezionismo & LEGO' },
  { id: 'Informatica & Telefonia', label: '💻 Informatica & Telefonia' },
  { id: 'Abbigliamento', label: '👕 Abbigliamento' },
  { id: 'Casa & Arredamento', label: '🏠 Casa & Arredo' },
  { id: 'Sport & Bici', label: '🚲 Sport & Bici' },
  { id: 'Altro', label: '📦 Altro' },
];

const QUARTIERI_GENOVA = [
  'Centro Storico / Caruggi',
  'Porto Antico / Molo',
  'San Vincenzo / Piazza De Ferrari',
  'Castelletto / Spianata',
  'Carignano',
  'Manin / Circonvallazione a Monte',
  'Oregina / Lagaccio',
  'Principe / Dinegro',
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
  'Marassi / Stadio',
  'San Fruttuoso',
  'Quezzi / Fereggiano',
  'Staglieno',
  'Molassana',
  'Struppa / Prato',
  'Rivarolo / Certosa',
  'Fegino / Trasta',
  'Bolzaneto',
  'Morego / San Quirico',
  'Pontedecimo',
];

const PAROLE_VIETATE = [
  'arma', 'armi', 'pistola', 'fucile', 'coltello', 'droga', 'erba', 'fumo',
  'cocaina', 'hashish', 'marijuana', 'farmaco', 'medicinale', 'replica'
];

export default function PubblicaAnnuncio() {
  const [titolo, setTitolo] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIE[0].id);
  const [quartiere, setQuartiere] = useState(QUARTIERI_GENOVA[0]);
  const [descrizione, setDescrizione] = useState('');
  const [luogoRitiro, setLuogoRitiro] = useState('');
  const [immagini, setImmagini] = useState<string[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviato, setInviato] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('zena_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('zena_user_id', id);
    }
    setUserId(id);
  }, []);

  const gestisciFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 5 - immagini.length).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImmagini((prev) => (prev.length >= 5 ? prev : [...prev, reader.result as string]));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    const testo = `${titolo} ${descrizione}`.toLowerCase();
    const vietata = PAROLE_VIETATE.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(testo));
    if (vietata) {
      setCaricamento(false);
      setErrore(`Termine non consentito: "${vietata}".`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('annunci')
        .insert([{
          titolo,
          prezzo: parseFloat(prezzo) || 0,
          categoria,
          quartiere,
          luogo_ritiro: luogoRitiro,
          descrizione,
          immagini,
          stato: 'approvato',
          segnalato: false,
          user_id: userId,
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        fetch('/api/notifica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data[0].id,
            titolo,
            prezzo,
            quartiere,
            contatto: 'Chat interna Zena & Go',
          }),
        }).catch(() => {});
      }

      setInviato(true);
    } catch (err: any) {
      setErrore(err.message || 'Errore durante la pubblicazione.');
    } finally {
      setCaricamento(false);
    }
  };

  const inputStyle = { color: '#0f172a', backgroundColor: '#ffffff' };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-blue-800 transition">
            ← Torna alla bacheca
          </Link>
          <span className="text-[11px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-full border border-blue-200">
            Zena &amp; Go
          </span>
        </div>

        <h1 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Pubblica un annuncio</h1>
        <p className="text-xs text-slate-500 mb-5">Scambi a mano a Genova con chat anonima integrata.</p>

        {errore && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{errore}</div>}

        {inviato ? (
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 text-center space-y-3">
            <span className="text-3xl block">🎉</span>
            <h2 className="text-base font-extrabold text-blue-950 mb-1">Annuncio online!</h2>
            <p className="text-xs text-blue-800 leading-relaxed">
              Il tuo oggetto è visibile in bacheca con la categoria corretta. Riceverai i messaggi direttamente nella chat interna.
            </p>
            <Link href="/" className="inline-block bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs">
              Vai alla bacheca
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Foto ({immagini.length}/5)</label>
              <div className="flex gap-2 flex-wrap">
                {immagini.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImmagini(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 bg-slate-900/80 text-white text-[10px] w-5 h-5 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {immagini.length < 5 && (
                  <label className="w-16 h-16 border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-xl flex items-center justify-center cursor-pointer text-xs font-bold text-slate-400 hover:text-blue-800 transition">
                    + Foto
                    <input type="file" accept="image/*" multiple onChange={gestisciFoto} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Titolo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cosa offri? *</label>
              <input
                type="text"
                required
                style={inputStyle}
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="es. Collezione DVD, Batman Anno Uno, Console Xbox..."
                className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
              />
            </div>

            {/* Categoria e Prezzo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria *</label>
                <select
                  value={categoria}
                  style={inputStyle}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
                >
                  {CATEGORIE.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prezzo (€) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  style={inputStyle}
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  placeholder="0 se regalo"
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
                />
              </div>
            </div>

            {/* Quartiere e Punto d'Incontro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quartiere *</label>
                <select
                  value={quartiere}
                  style={inputStyle}
                  onChange={(e) => setQuartiere(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
                >
                  {QUARTIERI_GENOVA.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Punto d&apos;incontro suggerito</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={luogoRitiro}
                  onChange={(e) => setLuogoRitiro(e.target.value)}
                  placeholder="es. Piazza De Ferrari, Brignole..."
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
                />
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descrizione</label>
              <textarea
                rows={3}
                style={inputStyle}
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Condizioni dell'oggetto, dettagli sull'edizione o orari preferiti..."
                className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={caricamento}
              className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              {caricamento ? 'Pubblicazione in corso...' : 'Pubblica Annuncio'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
