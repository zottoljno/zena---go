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
  const [avvioInCorso, setAvvioInCorso] = useState(false);

  useEffect(() => {
    const caricaDati = async () => {
      setCaricamento(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMioId(session.user.id);
      }

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
    if (avvioInCorso) return;
    setAvvioInCorso(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?redirect=/annuncio/${annuncioId}`);
        return;
      }

      if (!annuncio) return;

      if (annuncio.user_id === session.user.id) {
        router.push('/profilo');
        return;
      }

      // Ricerca rapida solo dell'ID per ridurre la latenza
      const { data: esistente } = await supabase
        .from('conversazioni')
        .select('id')
        .eq('annuncio_id', annuncio.id)
        .eq('compratore_id', session.user.id)
        .maybeSingle();

      if (esistente?.id) {
        router.push(`/chat?id=${esistente.id}`);
        return;
      }

      // Creazione veloce della nuova riga
      const { data: nuova, error } = await supabase
        .from('conversazioni')
        .insert({
          annuncio_id: annuncio.id,
          compratore_id: session.user.id,
          venditore_id: annuncio.user_id || session.user.id,
        })
        .select('id')
        .single();

      if (!error && nuova?.id) {
        router.push(`/chat?id=${nuova.id}`);
      } else {
        router.push('/chat');
      }
    } catch (err) {
      console.error('Errore avvio chat:', err);
      setAvvioInCorso(false);
    }
  };

  const condividiLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2200);
    }
  };

  const condividiSuWhatsApp = () => {
    if (!annuncio) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const prezzoTesto = annuncio.prezzo === 0 ? 'Gratis' : `${annuncio.prezzo} €`;
    const messaggio = encodeURIComponent(
      `Guarda questo annuncio su Zena & Go: "${annuncio.titolo}" (${prezzoTesto}) a Genova (${annuncio.quartiere})\n\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${messaggio}`, '_blank');
  };

  if (caricamento) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">
        Caricamento annuncio in corso...
      </div>
    );
  }

  if (!annuncio) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-base font-bold text-slate-900 mb-2">Annuncio non trovato</h1>
        <p className="text-xs text-slate-500 mb-4">L'oggetto potrebbe essere stato venduto o rimosso.</p>
        <Link href="/" className="text-xs bg-blue-800 text-white font-bold px-4 py-2 rounded-xl">
          Torna alla bacheca
        </Link>
      </div>
    );
  }

  const immagini = annuncio.immagini && annuncio.immagini.length > 0 ? annuncio.immagini : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-2">
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-blue-900 flex items-center gap-1">
            ← Torna alla bacheca
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={condividiSuWhatsApp}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <span>📲</span>
              <span>WhatsApp</span>
            </button>
            <button
              onClick={condividiLink}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium border border-slate-200 px-3 py-1.5 rounded-xl bg-slate-50"
            >
              {copiato ? '✓ Link copiato!' : '🔗 Copia link'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Colonna Sinistra: Galleria Fotografica */}
          <div className="md:col-span-7 space-y-3">
            <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs aspect-4/3 flex items-center justify-center group">
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
                    className="absolute bottom-3 right-
