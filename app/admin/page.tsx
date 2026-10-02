'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Annuncio {
  id: any;
  titolo: string;
  prezzo: number;
  quartiere: string;
  descrizione?: string;
  contatto?: string;
  immagini?: string[];
  created_at?: string;
  segnalato?: boolean;
  motivo_segnalazione?: string;
}

const PIN_SEGRETO = '326996';

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
    try {
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore caricamento:', error);
      } else if (data) {
        setAnnunci(data as Annuncio[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    if (autenticato) {
      caricaAnnunci();
    }
  }, [autenticato]);

  const eliminaAnnuncio = async (id: any, titolo: string) => {
    const conferma = window.confirm(`Vuoi cancellare definitivamente l'annuncio "${titolo}"?`);
    if (!conferma) return;

    try {
      const { error } = await supabase.from('annunci').delete().eq('id', id);
      if (error) {
        alert("Errore nell'eliminazione: " + error.message);
      } else {
        setAnnunci((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err: any) {
      alert("Errore: " + err.message);
    }
  };

  if (!autenticato) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={verificaPin} className="bg-white p-6 rounded-2xl shadow-md max-w-sm w-full border border-slate-200 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Accesso Moderatore</h1>
          <p className="text-xs text-slate-500 mb-5">Inserisci il PIN per moderare gli annunci</p>
          <input
            type="password"
            maxLength={4}
            value={pinInserito}
            onChange={(e) => setPinInserito(e.target.value)}
            placeholder="PIN"
            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
            className="w-full text-center text-2xl tracking-widest py-2.5 px-3 border border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold"
          />
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Entra
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pannello Moderazione Zena &amp; Go</h1>
            <p className="text-xs text-slate-500 mt-1">Elimina gli annunci non conformi o pericolosi</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-emerald-600 hover:underline">
            ← Vai al sito
          </Link>
        </div>

        {caricamento ? (
          <div className="text-center py-12 text-slate-500">Caricamento annunci in corso...</div>
        ) : annunci.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            Nessun annuncio presente al momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {annunci.map((annuncio) => (
              <div
                key={annuncio.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-100 relative">
                    {annuncio.immagini && annuncio.immagini.length > 0 ? (
                      <img
                        src={annuncio.immagini[0]}
                        alt={annuncio.titolo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Nessuna foto
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-bold text-slate-900 text-base">{annuncio.titolo}</h2>
                      <span className="font-black text-slate-900 text-sm shrink-0">
                        {annuncio.prezzo === 0 ? 'Gratis' : `${annuncio.prezzo} €`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">📍 {annuncio.quartiere} • Contatto: {annuncio.contatto || 'N/D'}</p>
                    {annuncio.descrizione && (
                      <p className="text-xs text-slate-600 line-clamp-3">{annuncio.descrizione}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => eliminaAnnuncio(annuncio.id, annuncio.titolo)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                  >
                    🗑️ Elimina subito annuncio
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
