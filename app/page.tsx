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
  categoria?: string;
  luogo_ritiro?: string;
  descrizione?: string;
  immagini?: string[];
  venduto?: boolean;
  created_at?: string;
  user_id?: string;
}

const CATEGORIE = [
  { id: 'Tutte', label: 'Tutte le categorie', icon: '✨' },
  { id: 'Fumetti & Manga', label: 'Fumetti & Manga', icon: '📚' },
  { id: 'Videogiochi & Console', label: 'Videogiochi & Console', icon: '🎮' },
  { id: 'Cinema & DVD', label: 'Cinema & DVD', icon: '🎬' },
  { id: 'Collezionismo & LEGO', label: 'Collezionismo & LEGO', icon: '🧱' },
  { id: 'Informatica & Telefonia', label: 'Informatica & Telefonia', icon: '💻' },
  { id: 'Abbigliamento', label: 'Abbigliamento', icon: '👕' },
  { id: 'Casa & Arredamento', label: 'Casa & Arredo', icon: '🏠' },
  { id: 'Sport & Bici', label: 'Sport & Bici', icon: '🚲' },
  { id: 'Altro', label: 'Altro', icon: '📦' },
];

const QUARTIERI_GENOVA = [
  'Tutti i quartieri',
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

export default function Home() {
  const router = useRouter();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [sessioneUtente, setSessioneUtente] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [filtroQuartiere, setFiltroQuartiere] = useState('Tutti i quartieri');
  const [filtroCategoria, setFiltroCategoria] = useState('Tutte');
  const [soloPreferiti, setSoloPreferiti] = useState(false);
  const [preferiti, setPreferiti] = useState<number[]>([]);
  const [ricerca, setRicerca] = useState('');
  const [nonLettiTotali, setNonLettiTotali] = useState(0);

  useEffect(() => {
    let montato = true;

    // Cache e preferiti locali
    try {
      const cacheAnnunci = localStorage.getItem('zena_annunci_cache');
      if (cacheAnnunci) {
        const parsed = JSON.parse(cacheAnnunci);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAnnunci(parsed);
          setCaricamento(false);
        }
      }
      const cachedNick = localStorage.getItem('zena_nickname');
      if (cachedNick) setNickname(cachedNick);

      const prefSalvati = localStorage.getItem('zena_preferiti');
      if (prefSalvati) {
        setPreferiti(JSON.parse(prefSalvati));
      }
    } catch {}

    // Controllo sessione Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && montato) {
        setSessioneUtente(session.user);
        const nick =
          session.user.user_metadata?.nickname ||
          session.user.email?.split('@')[0] ||
          'Genovese';
        setNickname(nick);
        localStorage.setItem('zena_user_id', session.user.id);
        localStorage.setItem('zena_nickname', nick);

        supabase
          .from('messaggi')
          .select('id', { count: 'exact', head: true })
          .neq('mittente_id', session.user.id)
          .eq('letto', false)
          .then(({ count }) => {
            if (count && montato) setNonLettiTotali(count);
          });
      }
    });

    const scaricaDati = async () => {
      try {
        const { data, error } = await supabase
          .from('annunci')
          .select('id, titolo, prezzo, quartiere, categoria, immagini, venduto, created_at, user_id, descrizione')
          .order('created_at', { ascending: false });

        if (!montato) return;

        if (!error && data) {
          const lista = data as Annuncio[];
          setAnnunci(lista);
          try {
            localStorage.setItem('zena_annunci_cache', JSON.stringify(lista));
          } catch {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (montato) setCaricamento(false);
      }
    };

    scaricaDati();

    return () => {
      montato = false;
    };
  }, []);

  const togglePreferito = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();

    let nuovaLista: number[];
    if (preferiti.includes(id)) {
      nuovaLista = preferiti.filter((favId) => favId !== id);
    } else {
      nuovaLista = [...preferiti, id];
    }

    setPreferiti(nuovaLista);
    try {
      localStorage.setItem('zena_preferiti', JSON.stringify(nuovaLista));
    } catch {}
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
    const matchCategoria =
      filtroCategoria === 'Tutte' || a.categoria === filtroCategoria;
    const matchPreferito = !soloPreferiti || preferiti.includes(a.id);
    const matchRicerca =
      !ricerca.trim() ||
      a.titolo.toLowerCase().includes(ricerca.toLowerCase()) ||
      (a.descrizione && a.descrizione.toLowerCase().includes(ricerca.toLowerCase()));

    return matchQuartiere && matchCategoria && matchPreferito && matchRicerca;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
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

      {/* Hero & Ricerca */}
      <section className="bg-white border-b border-slate-200 py-5 sm:py-7 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Zero commissioni. Zero spedizioni. Solo a Genova.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Compra, vendi e scambia a mano nel tuo quartiere in tutta sicurezza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="relative sm:col-span-6">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Cosa cerchi? (es. Batman, DVD, Nintendo, libri...)"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full text-xs border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 shadow-2xs"
              />
            </div>

            <div className="relative sm:col-span-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">📍</span>
              <select
                value={filtroQuartiere}
                onChange={(e) => setFiltroQuartiere(e.target.value)}
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full text-xs border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 shadow-2xs"
              >
                {QUARTIERI_GENOVA.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* Pulsante filtro Preferiti rapido */}
            <button
              type="button"
              onClick={() => setSoloPreferiti(!soloPreferiti)}
              className={`sm:col-span-2 text-xs font-bold rounded-xl px-3 py-2.5 border transition flex items-center justify-center gap-1.5 shadow-2xs ${
                soloPreferiti
                  ? 'bg-red-50 text-red-600 border-red-300 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <span>{soloPreferiti ? '❤️' : '🤍'}</span>
              <span>Preferiti ({preferiti.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pillole Categorie */}
      <section className="bg-white border-b border-slate-200/80 sticky top-[57px] z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {CATEGORIE.map((cat) => {
              const attiva = filtroCategoria === cat.id;
              const conteggio = cat.id === 'Tutte'
                ? annunci.length
                : annunci.filter((a) => a.categoria === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    attiva
                      ? 'bg-blue-800 text-white shadow-xs scale-102 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.label}</span>
                  {conteggio > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        attiva ? 'bg-blue-900/60 text-blue-100' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {conteggio}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bacheca */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {soloPreferiti
              ? 'I tuoi annunci preferiti'
              : filtroCategoria === 'Tutte'
              ? 'Tutti gli annunci'
              : filtroCategoria}
            <span className="text-slate-400 font-normal lowercase ml-1">
              ({annunciFiltrati.length} disponibili)
            </span>
          </div>

          {(filtroCategoria !== 'Tutte' || filtroQuartiere !== 'Tutti i quartieri' || soloPreferiti || ricerca) && (
            <button
              onClick={() => {
                setFiltroCategoria('Tutte');
                setFiltroQuartiere('Tutti i quartieri');
                setSoloPreferiti(false);
                setRicerca('');
              }}
              className="text-xs text-blue-800 hover:underline font-semibold"
            >
              Azzera filtri ✕
            </button>
          )}
        </div>

        {caricamento && annunci.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Caricamento bacheca...</div>
        ) : annunciFiltrati.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto my-8 shadow-xs space-y-3">
            <p className="text-3xl">{soloPreferiti ? '❤️' : '📦'}</p>
            <h3 className="font-bold text-slate-900 text-base">
              {soloPreferiti ? 'Nessun annuncio tra i preferiti' : 'Nessun oggetto trovato'}
            </h3>
            <p className="text-xs text-slate-500">
              {soloPreferiti
                ? 'Clicca sul cuoricino degli annunci che ti interessano per ritrovarli qui al volo!'
                : 'Prova ad azzerare i filtri o pubblica tu per primo!'}
            </p>
            {soloPreferiti ? (
              <button
                onClick={() => setSoloPreferiti(false)}
                className="inline-block bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-900 transition shadow-xs"
              >
                Esplora tutta la bacheca
              </button>
            ) : (
              <button
                onClick={() => handleAzioneProtetta('/pubblica')}
                className="inline-block bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-900 transition shadow-xs"
              >
                + Pubblica un annuncio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {annunciFiltrati.map((item) => {
              const isFav = preferiti.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group ${
                    item.venduto ? 'opacity-85' : ''
                  }`}
                >
                  <Link href={`/annuncio/${item.id}`} className="block flex-1 relative">
                    <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                      {item.immagini && item.immagini.length > 0 ? (
                        <img
                          src={item.immagini[0]}
                          alt={item.titolo}
                          loading="lazy"
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

                      {/* Cuoricino Salva Preferito */}
                      <button
                        type="button"
                        onClick={(e) => togglePreferito(e, item.id)}
                        className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xs transition shadow-xs z-10 ${
                          isFav
                            ? 'bg-red-500 text-white scale-110 shadow-red-500/20'
                            : 'bg-slate-900/50 hover:bg-slate-900/80 text-white'
                        }`}
                        title={isFav ? 'Rimuovi dai preferiti' : 'Salva tra i preferiti'}
                      >
                        <span className="text-xs">{isFav ? '❤️' : '🤍'}</span>
                      </button>

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
                      <h2 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-800 transition mb-1">
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
