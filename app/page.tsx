'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  // Centro & Collina
  'Centro Storico / Caruggi',
  'Porto Antico / Molo',
  'San Vincenzo / Piazza De Ferrari',
  'Castelletto / Spianata',
  'Carignano',
  'Manin / Circonvallazione a Monte',
  'Oregina / Lagaccio',
  'Principe / Dinegro',

  // Levante & Mare
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

  // Ponente
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

  // Val Bisagno
  'Marassi / Stadio',
  'San Fruttuoso',
  'Quezzi / Fereggiano',
  'Staglieno',
  'Molassana',
  'Struppa / Prato',

  // Val Polcevera
  'Rivarolo / Certosa',
  'Fegino / Trasta',
  'Bolzaneto',
  'Morego / San Quirico',
  'Pontedecimo',
];

export default function Home() {
  const router = useRouter();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [sessioneUtente, setSessioneUtente] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [filtroQuartiere, setFiltroQuartiere] = useState('Tutti i quartieri');
  const [ricerca, setRicerca] = useState('');
  const [soloRegalo, setSoloRegalo] = useState(false);

  useEffect(() => {
    const controllaSessione = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessioneUtente(session.user);
        const nick = session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'Genovese';
        setNickname(nick);
        localStorage.setItem('zena_user_id', session.user.id);
        localStorage.setItem('zena_nickname', nick);
      }
    };

    controllaSessione();
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

  const handleAzioneProtetta = (destinazione: string) => {
    if (sessioneUtente) {
      router.push(destinazione);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(destinazione)}`);
    }
  };

  const disconnetti = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('zena_user_id');
    localStorage.removeItem('zena_nickname');
    setSessioneUtente(null);
    setNickname('');
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">Zena &amp; Go</span>
            <span className="hidden sm:inline-block text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {sessioneUtente ? (
              <>
                <Link
                  href="/profilo"
                  className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <span>👤</span>
                  <span>{nickname}</span>
                </Link>

                <button
                  onClick={() => handleAzioneProtetta('/chat')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition border border-slate-200"
                >
                  <span>💬</span>
                  <span className="hidden sm:inline">Messaggi</span>
                </button>

                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
                >
                  <span>+</span>
                  <span>Pubblica</span>
                </button>

                <button
                  onClick={disconnetti}
                  className="text-xs text-slate-400 hover:text-red-600 p-1 transition"
                  title="Esci"
                >
                  Esci
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
                >
                  <span>+</span>
                  <span>Pubblica</span>
                </button>

                <Link
                  href="/login"
                  className="text-xs font-bold bg-slate-900 hover:bg-black text-white px-3.5 py-1.5 rounded-xl transition"
                >
                  Accedi
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Ricerca */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Scambia, regala e trova oggetti a Genova
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Esplora liberamente gli annunci. Accordati con la <strong>chat interna</strong> al momento dello scambio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              placeholder="Cosa stai cercando? (es. DVD, fumetti, libri...)"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="sm:col-span-2 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <select
              value={filtroQuartiere}
              onChange={(e) => setFiltroQuartiere(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {QUARTIERI_GENOVA.map((q) => (
                <option key={q} value={q} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSoloRegalo(!soloRegalo)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition flex items-center gap-1.5 ${
                soloRegalo
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>🎁</span>
              <span>Solo oggetti in regalo</span>
            </button>
            <span className="text-xs text-slate-400">
              ({annunciFiltrati.length} annunci disponibili)
            </span>
          </div>
        </div>
      </section>

      {/* Griglia Annunci */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {caricamento ? (
          <div className="text-center py-16 text-slate-400 text-sm">Caricamento bacheca...</div>
        ) : annunciFiltrati.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto my-8">
            <p className="text-3xl mb-2">🔍</p>
            <h3 className="font-bold text-slate-900 text-base mb-1">Nessun annuncio trovato</h3>
            <p className="text-xs text-slate-500 mb-4">Prova un altro quartiere o inserisci il tuo annuncio!</p>
            <button
              onClick={() => handleAzioneProtetta('/pubblica')}
              className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition"
            >
              Pubblica un annuncio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {annunciFiltrati.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
              >
                {/* Cliccando sull'anteprima si apre la pagina dedicata dell'annuncio */}
                <Link href={`/annuncio/${item.id}`} className="block flex-1">
                  <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                    {item.immagini && item.immagini.length > 0 ? (
                      <img
                        src={item.immagini[0]}
                        alt={item.titolo}
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                        <span className="text-2xl mb-1">📦</span>
                        Nessuna foto
                      </div>
                    )}
                    <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white font-black text-xs px-2.5 py-1 rounded-lg">
                      {item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`}
                    </span>
                  </div>

                  <div className="p-3.5">
                    <h2 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1 group-hover:text-emerald-700 transition">
                      {item.titolo}
                    </h2>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-2">
                      <span>📍</span>
                      <span className="truncate">{item.quartiere}</span>
                    </p>
                    {item.descrizione && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.descrizione}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Tasto rapido chat */}
                <div className="p-3.5 pt-0">
                  <button
                    onClick={() =>
                      handleAzioneProtetta(
                        `/chat?annuncioId=${item.id}&venditore=${item.user_id || 'venditore_default'}`
                      )
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>💬</span>
                    <span>Scrivi in Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
