'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Annuncio {
  id: number;
  titolo: string;
  prezzo: number;
  quartiere: string;
  descrizione: string;
  contatto: string;
  immagini: string[];
  created_at: string;
  segnalato?: boolean;
  motivo_segnalazione?: string;
}

const PIN_SEGRETO = '1306';

export default function AdminPage() {
  const [autenticato, setAutenticato] = useState(false);
  const [pinInserito, setPinInserito] = useState('');
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  const verificaPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInserito === PIN_SEGRETO) {
      setAutenticato(true);
    } else {
      alert('PIN errato!');
      setPinInserito('');
    }
  };

  const caricaAnnunci = async () => {
    setCaricamento(true);
    // Ordina prima quelli segnalati, poi i più recenti
    const { data, error } = await supabase
      .from('annunci')
      .select('*')
      .order('segnalato', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnunci(data as Annuncio[]);
    }
    setCaricamento(false);
  };

  useEffect(() => {
    if (autenticato) {
      caricaAnnunci();
    }
  }, [autenticato]);

  const eliminaAnnuncio = async (id: number, titolo: string) => {
    const conferma = window.confirm(`Vuoi cancellare definitivamente "${titolo}"?`);
    if (!conferma) return;

    const { error } = await supabase.from('annunci').delete().eq('id', id);

    if (error) {
      alert("Errore durante l'eliminazione: " + error.message);
    } else {
      setAnnunci((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const ignoraSegnalazione = async (id: number) => {
    const { error } = await supabase
      .from('annunci')
      .update({ segnalato: false, motivo_segnalazione: null })
      .eq('id', id);

    if (!error) {
      setAnnunci((prev) =>
        prev.map((a) => (a.id === id ? { ...a, segnalato: false, motivo_segnalazione: undefined } : a))
      );
    }
  };

  if (!autenticato) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={verificaPin} className="bg-white p-6 rounded-2xl shadow-md max-w-sm w-full border border-slate-200 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Pannello Moderatore</h1>
          <p className="text-xs text-slate-500 mb-4">Inserisci il PIN per visualizzare e rimuovere gli annunci</p>
          <input
            type="password"
            maxLength={4}
            value={pinInserito}
            onChange={(e) => setPinInserito(e.target.value)}
            placeholder="PIN"
            className="w-full text-center text-2xl tracking-widest py-2 px-3 border border-slate-300 rounded-lg mb-4 text-slate-900"
          />
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  const segnalatiCount = annunci.filter((a) => a.segnalato).length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Moderazione Zena &amp; Go</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {segnalatiCount > 0 ? (
                <span className="font-semibold text-red-600">🚨 Ci sono {segnalatiCount} annunci segnalati da verificare</span>
              ) : (
                'Tutti gli annunci sono in ordine'
              )}
            </p>
          </div>
          <Link href="/" className="text-sm text-emerald-600 hover:underline font-medium">
            ← Torna al sito
          </Link>
        </div>

        {caricamento ? (
          <p className="text-center text-slate-500 py-12">Caricamento...</p>
        ) : annunci.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 font-medium">Nessun annuncio presente nel database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {annunci.map((annuncio) => (
              <div
                key={annuncio.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between transition ${
                  annuncio.segnalato
                    ? 'border-2 border-red-500 ring-2 ring-red-100'
                    : 'border border-slate-200'
                }`}
              >
                <div>
                  {annuncio.segnalato && (
                    <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 flex items-center justify-between">
                      <span>🚨 SEGNALATO DALLA COMMUNITY</span>
                      <button
                        type="button"
                        onClick={() => ignoraSegnalazione(annuncio.id)}
                        className="text-[10px] underline hover:text-red-200"
                      >
                        Ignora segnalazione
                      </button>
                    </div>
                  )}

                  {annuncio.segnalato && annuncio.motivo_segnalazione && (
                    <div className="bg-red-50 p-2.5 text-xs text-red-800 border-b border-red-200">
                      <strong>Motivo:</strong> {annuncio.motivo_segnalazione}
                    </div>
                  )}

                  <div className="aspect-video bg-slate-100 relative">
                    {annuncio.immagini && annuncio.immagini.length > 0 ? (
                      <img
                        src={annuncio.immagini[0]}
                        alt={annuncio.titolo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                        Nessuna foto
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-semibold text-slate-900 text-lg leading-snug">{annuncio.titolo}</h2>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm shrink-0">
                        {annuncio.prezzo === 0 ? 'Gratis' : `${annuncio.prezzo} €`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">📍 {annuncio.quartiere} • Contatto: {annuncio.contatto}</p>
                    <p className="text-sm text-slate-600 line-clamp-3">{annuncio.descrizione || 'Nessuna descrizione.'}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => eliminaAnnuncio(annuncio.id, annuncio.titolo)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    🗑️️ Elimina subito annuncio
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
