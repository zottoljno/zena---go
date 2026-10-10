'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Annuncio {
  id: number;
  titolo: string;
  descrizione: string;
  prezzo: number;
  quartiere: string;
  immagini?: string[];
  user_id?: string;
  created_at: string;
}

export default function DettaglioAnnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const annuncioId = resolvedParams.id;
  const router = useRouter();

  const [annuncio, setAnnuncio] = useState<Annuncio | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [fotoSelezionata, setFotoSelezionata] = useState(0);
  const [zoomAperto, setZoomAperto] = useState(false);
  const [nicknameVenditore, setNicknameVenditore] = useState('Venditore Genovese');
  const [copiato, setCopiato] = useState(false);
  const [mioId, setMioId] = useState<string | null>(null);

  useEffect(() => {
    const caricaDati = async () => {
      setCaricamento(true);

      // Controlla utente corrente
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMioId(session.user.id);
      }

      // Recupera annuncio
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .eq('id', annuncioId)
        .single();

      if (error || !data) {
        setCaricamento(false);
        return;
      }

      setAnnuncio(data as Annuncio);

      // Cerca il nickname del venditore se disponibile
      if (data.user_id) {
        const { data: profileData } = await supabase
          .from('profili')
          .select('nickname')
          .eq('id', data.user_id)
          .single();

        if (profileData?.nickname) {
          setNicknameVenditore(profileData.nickname);
        }
      }

      setCaricamento(false);
    };

    caricaDati();
  }, [annuncioId]);

  const avviaChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?redirect=/annuncio/${annuncioId}`);
      return;
    }

    if (!annuncio) return;

    // Se l'annuncio è dell'utente stesso, manda al profilo
    if (annuncio.user_id === session.user.id) {
      router.push('/profilo');
      return;
    }

    // Cerca o crea la conversazione
    const { data: esistente } = await supabase
      .from('conversazioni')
      .select('id')
      .eq('annuncio_id', annuncio.id)
      .eq('compratore_id', session.user.id)
      .maybeSingle();

    if (esistente) {
      router.push(`/chat?id=${esistente.id}`);
    } else {
      const { data: nuova, error } = await supabase
        .from('conversazioni')
        .insert({
          annuncio_id: annuncio.id,
          compratore_id: session.user.id,
          venditore_id: annuncio.user_id || session.user.id,
        })
        .select()
        .single();

      if (!error && nuova) {
        router.push(`/chat?id=${nuova.id}`);
      } else {
        router.push('/chat');
      }
    }
  };

  const condividi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    }
  };

  if (caricamento) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Caricamento annuncio in corso...
      </div>
    );
  }

  if (!annuncio) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-base font-bold text-slate-900 mb-2">Annuncio non trovato</h1>
        <p className="text-xs text-slate-500 mb-4">L'oggetto potrebbe essere stato venduto o rimosso.</p>
        <Link href="/" className="text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl">
          Torna alla bacheca
        </Link>
      </div>
    );
  }

  const immagini = annuncio.immagini && annuncio.immagini.length > 0 ? annuncio.immagini : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            ← Torna alla bacheca
          </Link>
          <button
            onClick={condividi}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold border border-slate-200 px-3 py-1.5 rounded-xl bg-slate-50"
          >
            {copiato ? '✓ Link copiato!' : '🔗 Condividi'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Colonna Sinistra: Galleria Fotografica */}
          <div className="md:col-span-7 space-y-3">
            <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs aspect-4/3 flex items-center justify-center group">
              {immagini.length > 0 ? (
                <>
                  <img
                    src={immagini[fotoSelezionata]}
                    alt={annuncio.titolo}
                    className="w-full h-full object-cover cursor-zoom-in transition duration-300 hover:scale-102"
                    onClick={() => setZoomAperto(true)}
                  />
                  <button
                    type="button"
                    onClick={() => setZoomAperto(true)}
                    className="absolute bottom-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 transition"
                  >
                    <span>🔍</span> Ingrandisci
                  </button>
                  <span className="absolute top-3 left-3 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {fotoSelezionata + 1} / {immagini.length}
                  </span>
                </>
              ) : (
                <div className="text-center p-8">
                  <span className="text-4xl block mb-2">📷</span>
                  <p className="text-xs text-slate-400 font-medium">Nessuna foto disponibile</p>
                </div>
              )}
            </div>

            {/* Miniature cliccabili */}
            {immagini.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {immagini.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFotoSelezionata(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                      fotoSelezionata === idx ? 'border-emerald-600 shadow-xs' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonna Destra: Dettagli, Venditore & Azione */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    📍 {annuncio.quartiere}
                  </span>
                  <span className="text-[11px] text-slate-400">Genova</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {annuncio.titolo}
                </h1>
              </div>

              <div className="flex items-baseline gap-2 py-1">
                <span className="text-3xl font-black text-slate-900">
                  {annuncio.prezzo === 0 ? 'Gratis' : `${annuncio.prezzo} €`}
                </span>
                {annuncio.prezzo > 0 && (
                  <span className="text-xs text-slate-500 font-medium">Ritiro e scambio a mano</span>
                )}
              </div>

              {/* Box Venditore */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                    {nicknameVenditore.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{nicknameVenditore}</p>
                    <p className="text-[10px] text-slate-500">Membro Zena &amp; Go</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-semibold">
                  Verificato
                </span>
              </div>

              {/* Pulsante Chat */}
              {mioId === annuncio.user_id ? (
                <Link
                  href="/profilo"
                  className="w-full inline-block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl text-xs transition"
                >
                  Questo è un tuo annuncio (gestisci)
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={avviaChat}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>💬</span>
                  <span>Scrivi in Chat al Venditore</span>
                </button>
              )}

              {/* Descrizione Oggetto */}
              <div className="pt-2 border-t border-slate-100">
                <h2 className="text-xs font-bold text-slate-900 mb-2">Descrizione dell'oggetto</h2>
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {annuncio.descrizione || 'Nessuna descrizione fornita.'}
                </p>
              </div>

              {/* Promemoria Sicurezza */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <span className="text-sm">🛡️</span>
                <span>
                  <strong>Scambio sicuro a Genova:</strong> incontratevi sempre di persona in un luogo pubblico del quartiere e verificate l'oggetto prima di pagare in contanti.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Zoom Schermo Intero (Lightbox) */}
      {zoomAperto && immagini.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setZoomAperto(false)}
        >
          <button
            type="button"
            onClick={() => setZoomAperto(false)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>
          
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={immagini[fotoSelezionata]}
              alt={annuncio.titolo}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {immagini.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto p-2" onClick={(e) => e.stopPropagation()}>
              {immagini.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFotoSelezionata(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                    fotoSelezionata === idx ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
