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
  venduto?: boolean;
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
  const [nonLettiTotali, setNonLettiTotali] = useState(0);

  useEffect(() => {
    let montato = true;

    const controllaSessione = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && montato) {
        setSessioneUtente(session.user);
        const nick =
          session.user.user_metadata?.nickname ||
          session.user.email?.split('@')[0] ||
          'Genovese';
        setNickname(nick);
        localStorage.setItem('zena_user_id', session.user.id);
        localStorage.setItem('zena_nickname', nick);

        // Conta messaggi non letti destinati all'utente corrente
        try {
          const { count, error } = await supabase
            .from('messaggi')
            .select('id', { count: 'exact', head: true })
            .neq('mittente_id', session.user.id)
            .eq('letto', false);

          if (!error && count && montato) {
            setNonLettiTotali(count);
          }
        } catch (err) {
          console.error('Errore conteggio messaggi non letti:', err);
        }
      }
    };

    controllaSessione();
    caricaAnnunci();

    return () => {
      montato = false;
    };
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
        setAnnunci([]);
      } else if (data) {
        setAnnunci(data as Annuncio[]);
      }
    } catch (err) {
      console.error(err);
      setAnnunci([]);
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
    setNonLettiTotali(0);
  };

  const annunciFiltrati = annunci.filter((a) => {
    const matchQuartiere =
      filtroQuartiere === 'Tutti i quartieri' || a.quartiere === filtroQuartiere;
    const matchRicerca =
      !ricerca.trim() ||
      a.titolo.toLowerCase().includes(ricerca.toLowerCase()) ||
      (a.descrizione && a.descrizione.toLowerCase().includes(ricerca.toLowerCase()));

    return matchQuartiere && matchRicerca;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header Genova Blu & Ardesia */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Zena <span className="text-blue-800">&amp;</span> Go
            </span>
            <span className="hidden sm:inline-block text-[11px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {sessioneUtente ? (
              <>
                <Link
                  href="/profilo"
                  className="text-xs font-semibold text-slate-700 hover:text-blue-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <span>👤</span>
                  <span>{nickname}</span>
                </Link>

                <button
                  onClick={() => handleAzioneProtetta('/chat')}
                  className="relative flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition border border-slate-200"
                >
                  <span>💬</span>
                  <span className="hidden sm:inline">Messaggi</span>
                  {nonLettiTotali > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight">
                      {nonLettiTotali}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="flex items-center gap-1 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
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
                  className="flex items-center gap-1 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
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

      {/* Hero: Zero Commissioni, Zero Spedizioni */}
      <section className="bg-white border-b border-slate-200 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Zero commissioni. Zero spedizioni. Solo a Genova.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
              Il marketplace per comprare e vendere a mano nel tuo quartiere: accordati in <strong>chat</strong> e scambia di persona.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              🤝 Scambio a mano
            </span>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
              ⚡ 0% commissioni
            </span>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              📍 Nei quartieri di Genova
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              placeholder="Cosa cerchi? (es. DVD, fumetti, libri, console...)"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="sm:col-span-2 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700"
            />

            <select
              value={filtroQuartiere}
              onChange={(e) => setFiltroQuartiere(e.target.value)}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              {QUARTIERI_GENOVA.map((q) => (
                <option key={q} value={q} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400 pt-1">
            {annunciFiltrati.length} {annunciFiltrati.length === 1 ? 'annuncio disponibile' : 'annunci disponibili'}
          </div>
        </div>
      </section>

      {/* Bacheca Annunci */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {caricamento ? (
          <div className="text-center py-16 text-slate-400 text-sm">Caricamento bacheca...</div>
        ) : annunciFiltrati.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto my-8 shadow-xs">
            <p className="text-3xl mb-2">📦</p>
            <h3 className="font-bold text-slate-900 text-base mb-1">Nessun annuncio presente</h3>
            <p className="text-xs text-slate-500 mb-4">
              La bacheca è attualmente vuota. Sii il primo a pubblicare un oggetto a Genova!
            </p>
            <button
              onClick={() => handleAzioneProtetta('/pubblica')}
              className="inline-block bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-900 transition shadow-xs"
            >
              + Pubblica il primo annuncio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {annunciFiltrati.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group ${
                  item.venduto ? 'opacity-85' : ''
                }`}
              >
                <Link href={`/annuncio/${item.id}`} className="block flex-1">
                  <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                    {item.immagini && item.immagini.length > 0 ? (
                      <img
                        src={item.immagini[0]}
                        alt={item.titolo}
                        className={`w-full h-full object-cover transition duration-300 ${
                          item.venduto ? 'grayscale-[30%]' : 'group-hover:scale-103'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                        <span className="text-2xl mb-1">📦</span>
                        Nessuna foto
                      </div>
                    )}

                    {item.venduto ? (
                      <span className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center text-white font-black text-xs uppercase tracking-wider">
                        🤝 Scambiato
                      </span>
                    ) : (
                      <span className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white font-black text-xs px-2.5 py-1 rounded-lg">
                        {item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h2 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-800 transition">
                        {item.titolo}
                      </h2>
                    </div>
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

                <div className="p-3.5 pt-0">
                  {item.venduto ? (
                    <div className="w-full bg-slate-100 text-slate-400 font-bold text-xs py-2.5 rounded-xl text-center cursor-not-allowed">
                      Scambio Concluso
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        handleAzioneProtetta(
                          `/chat?annuncioId=${item.id}&venditore=${item.user_id || 'venditore_default'}`
                        )
                      }
                      className="w-full bg-slate-900 hover:bg-blue-800 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>💬</span>
                      <span>Scrivi in Chat</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
