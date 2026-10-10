'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const QUARTIERI_GENOVA = [
  'Centro Storico', 'Carignano / Foce', 'Albaro / San Martino',
  'Castelletto / Manin', 'San Fruttuoso / Marassi', 'Staglieno / Val Bisagno',
  'Sampierdarena / San Teodoro', 'Cornigliano / Sestri Ponente',
  'Pegli / Pra / Voltri', 'Quarto / Quinto / Nervi', 'Pontedecimo / Bolzaneto / Val Polcevera'
];

const PAROLE_VIETATE = [
  'arma', 'armi', 'pistola', 'fucile', 'coltello', 'droga', 'erba', 'fumo',
  'cocaina', 'hashish', 'marijuana', 'farmaco', 'medicinale', 'replica'
];

export default function PubblicaAnnuncio() {
  const [titolo, setTitolo] = useState('');
  const [prezzo, setPrezzo] = useState('');
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
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Torna alla bacheca
          </Link>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-full border border-emerald-200">
            Zena &amp; Go
          </span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">Pubblica un annuncio</h1>
        <p className="text-xs text-slate-500 mb-5">Scambi a mano a Genova con chat anonima integrata.</p>

        {errore && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{errore}</div>}

        {inviato ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <h2 className="text-base font-bold text-emerald-900 mb-1">Annuncio online!</h2>
            <p className="text-xs text-emerald-700 mb-4">Visibile in bacheca. Riceverai i messaggi nella chat interna.</p>
            <Link href="/" className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              Vai alla home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Foto ({immagini.length}/5)</label>
              <div className="flex gap-2 flex-wrap">
                {immagini.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImmagini(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black text-white text-[10px] px-1">✕</button>
                  </div>
                ))}
                {immagini.length < 5 && (
                  <label className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer text-xs text-slate-400">
                    + Foto
                    <input type="file" accept="image/*" multiple onChange={gestisciFoto} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cosa offri? *</label>
              <input type="text" required style={inputStyle} value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="es. Collezione DVD, Fotocamera..." className="w-full px-3 py-2 text-xs border rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Prezzo (€) *</label>
                <input type="number" min="0" step="0.5" required style={inputStyle} value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="0 se regalo" className="w-full px-3 py-2 text-xs border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quartiere *</label>
                <select value={quartiere} style={inputStyle} onChange={(e) => setQuartiere(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg">
                  {QUARTIERI_GENOVA.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Punto d&apos;incontro suggerito</label>
              <input type="text" style={inputStyle} value={luogoRitiro} onChange={(e) => setLuogoRitiro(e.target.value)} placeholder="es. Piazza De Ferrari, Brignole..." className="w-full px-3 py-2 text-xs border rounded-lg" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Descrizione</label>
              <textarea rows={3} style={inputStyle} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Dettagli sull'oggetto..." className="w-full px-3 py-2 text-xs border rounded-lg" />
            </div>

            <button type="submit" disabled={caricamento} className="w-full bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-700">
              {caricamento ? 'Pubblicazione...' : 'Pubblica Annuncio'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
