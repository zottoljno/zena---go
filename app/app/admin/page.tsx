'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Puoi cambiare questo PIN con quello che preferisci
const ADMIN_PIN = '1926';

interface Annuncio {
  id: number;
  created_at: string;
  titolo: string;
  prezzo: number;
  quartiere: string;
  luogo_ritiro?: string;
  descrizione?: string;
  contatto: string;
  immagini?: string[];
  stato?: string;
}

export default function AdminPage() {
  const [pinInserito, setPinInserito] = useState('');
  const [autenticato, setAutenticato] = useState(false);
  const [errorePin, setErrorePin] = useState(false);

  const [annunciInAttesa, setAnnunciInAttesa] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [messaggioAzione, setMessaggioAzione] = useState('');

  const inputStyle = {
    color: '#0f172a',
    backgroundColor: '#ffffff',
  };

  // Verifica PIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInserito === ADMIN_PIN) {
      setAutenticato(true);
      setErrorePin(false);
    } else {
      setErrorePin(true);
    }
  };

  // Carica tutti gli annunci che attendono moderazione
  const caricaAnnunciInAttesa = async () => {
    try {
      setCaricamento(true);
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .eq('stato', 'in_attesa')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore:', error);
      } else if (data) {
        setAnnunciInAttesa(data as Annuncio[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    if (autenticato) {
      caricaAnnunciInAttesa();
    }
  }, [autenticato]);

  // Approva annuncio (lo rende visibile nella home)
  const handleApprova = async (id: number) => {
    try {
      const { error } = await supabase
        .from('annunci')
        .update({ stato: 'approvato' })
        .eq('id', id);

      if (error) throw error;

      setAnnunciInAttesa((prev) => prev.filter((a) => a.id !== id));
      setMessaggioAzione('Annuncio approvato e pubblicato in Home!');
      setTimeout(() => setMessaggioAzione(''), 3000);
    } catch (err: any) {
      alert('Errore durante l\'approvazione: ' + err.message);
    }
  };

  // Rifiuta ed elimina annuncio definitivamente
  const handleRifiuta = async (id: number) => {
    const conferma = window.confirm('Sei sicuro di voler eliminare definitivamente questo annuncio?');
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('annunci')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnnunciInAttesa((prev) => prev.filter((a) => a.id !== id));
      setMessaggioAzione('Annuncio rifiutato ed eliminato.');
      setTimeout(() => setMessaggioAzione(''), 3000);
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + err.message);
    }
  };

  // Schermata di accesso tramite PIN
  if (!autenticato) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 bg-[#0d1b2a] text-white rounded-xl mx-auto flex items-center justify-center text-xl mb-3">
            🔒
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Area Moderazione</h1>
          <p className="text-xs text-slate-500 mb-4">Inserisci il PIN per revisionare gli annunci di Zena &amp; Go</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="PIN"
              value={pinInserito}
              onChange={(e) => setPinInserito(e.target.value)}
              style={inputStyle}
              className="w-full text-center tracking-widest text-lg font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1b2a]"
            />
            {errorePin && <p className="text-xs text-red-600 font-medium">PIN errato. Riprova.</p>}
            <button
              type="submit"
              className="w-full bg-[#0d1b2a] hover:bg-[#1b263b] text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              Accedi
            </button>
          </form>

          <Link href="/" className="inline-block mt-4 text-xs text-slate-500 hover:underline">
            ← Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  // Pannello di Moderazione
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Header Admin */}
        <div className="bg-[#0d1b2a] text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">Pannello Admin</span>
            <h1 className="text-lg font-black">Revisione Annunci</h1>
          </div>
          <Link
            href="/"
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            Vai al sito ↗
          </Link>
        </div>

        {messaggioAzione && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center">
            {messaggioAzione}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Annunci in attesa ({annunciInAttesa.length})
          </p>
          <button
            onClick={caricaAnnunciInAttesa}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            Aggiorna ↻
          </button>
        </div>

        {caricamento ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
            Caricamento annunci in attesa...
          </div>
        ) : annunciInAttesa.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-1">
            <span className="text-2xl">✨</span>
            <p className="text-sm font-bold text-slate-700">Tutto pulito!</p>
            <p className="text-xs text-slate-400">Non ci sono annunci da revisionare al momento.</p>
          </div>
        ) : (
          annunciInAttesa.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              {/* Galleria foto caricate */}
              {item.immagini && item.immagini.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {item.immagini.map((foto, idx) => (
                    <img
                      key={idx}
                      src={foto}
                      alt=""
                      className="w-24 h-24 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Informazioni annuncio */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">{item.titolo}</h3>
                  <span className="text-base font-black text-slate-900">
                    {item.prezzo === 0 ? 'In regalo' : `${item.prezzo} €`}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  📍 <strong>{item.quartiere}</strong>
                  {item.luogo_ritiro ? ` • Ritiro: ${item.luogo_ritiro}` : ''}
                </p>

                {item.descrizione && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.descrizione}
                  </p>
                )}

                <div className="text-[11px] text-slate-500 pt-1">
                  📞 Contatto fornito: <strong>{item.contatto}</strong>
                </div>
              </div>

              {/* Azioni di moderazione */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleApprova(item.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  ✓ Approva e pubblica
                </button>
                <button
                  type="button"
                  onClick={() => handleRifiuta(item.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  ✕ Rifiuta ed elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
