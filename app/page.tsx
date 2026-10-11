'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import InstallPrompt from './InstallPrompt';

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
  { id: 'Tutte', label: 'Tutti' },
  { id: 'Fumetti & Manga', label: 'Fumetti & Manga' },
  { id: 'Videogiochi & Console', label: 'Videogiochi' },
  { id: 'Cinema & DVD', label: 'Cinema & Film' },
  { id: 'Collezionismo & LEGO', label: 'Collezionismo' },
  { id: 'Informatica & Telefonia', label: 'Tecnologia' },
  { id: 'Abbigliamento', label: 'Abbigliamento' },
  { id: 'Casa & Arredamento', label: 'Casa' },
  { id: 'Sport & Bici', label: 'Sport' },
  { id: 'Altro', label: 'Altro' },
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

export default function HomePage() {
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

    try {
      const prefSalvati = localStorage.getItem('zena_preferiti');
      if (prefSalvati) setPreferiti(JSON.parse(prefSalvati));

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
    } catch {}

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 antialiased">
      <InstallPrompt />

      {/* Header Minimale */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black tracking-tight text-slate-950 flex items-center gap-1.5">
              <span>Zena</span>
              <span className="text-slate-400 font-light">&amp;</span>
              <span>Go</span>
            </Link>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full">
              Genova
            </span>
          </div>

          <div className="flex items-center gap-2">
            {sessioneUtente ? (
              <>
                <Link
                  href="/profilo"
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  {nickname}
                </Link>

                <button
                  onClick={() => handleAzioneProtetta('/chat')}
                  className="relative text-xs font-medium text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Messaggi</span>
                  {nonLettiTotali > 0 && (
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                      {nonLettiTotali}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer ml-1"
                >
                  + Vendi o Regala
                </button>

                <button
                  onClick={disconnetti}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition cursor-pointer"
                  title="Esci"
                >
                  Esci
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-medium text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-lg transition"
                >
                  Accedi
                </Link>

                <button
                  onClick={() => handleAzioneProtetta('/pubblica')}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Pubblica annuncio
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sezione Ricerca & Hero Essenziale */}
      <section className="bg-white border-b border-slate-200/80 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Scambi a mano tra quartieri.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              La bacheca libera di Genova senza intermediari, commissioni o spedizioni.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
            <div className="sm:col-span-6 relative">
              <input
                type="text"
                placeholder="Cosa cerchi? (es. Lego, DVD, Fumetti, Bicicletta...)"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={filtroQuartiere}
                onChange={(e) => setFiltroQuartiere(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition"
              >
                {QUARTIERI_GENOVA.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSoloPreferiti(!soloPreferiti)}
              className={`sm:col-span-2 text-xs font-semibold rounded-lg px-3 py-2.5 border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                soloPreferiti
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{soloPreferiti ? '❤️' : '🤍'}</span>
              <span>Preferiti ({preferiti.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Barra Categorie Essenziale */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIE.map((cat) => {
              const attiva = filtroCategoria === cat.id;
              const conteggio = cat.id === 'Tutte'
                ? annunci.length
                : annunci.filter((a) => a.categoria === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-md transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    attiva
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  {conteggio > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded-sm ${
                        attiva ? 'bg-slate-800 text-slate-300' : 'text-slate-400'
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

      {/* Griglia Annunci */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {soloPreferiti ? 'I tuoi preferiti' : filtroCategoria}
            <span className="font-normal lowercase ml-1">({annunciFiltrati.length})</span>
          </p>

          {(filtroCategoria !== 'Tutte' || filtroQuartiere !== 'Tutti i quartieri' || soloPreferiti || ricerca) && (
            <button
              onClick={() => {
                setFiltroCategoria('Tutte');
                setFiltroQuartiere('Tutti i quartieri');
                setSoloPreferiti(false);
                setRicerca('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
            >
              Azzera filtri
            </button>
          )}
        </div>

        {caricamento && annunci.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs">Caricamento bacheca...</div>
        ) : annunciFiltrati.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-sm mx-auto my-8 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Nessun oggetto trovato</p>
            <p className="text-xs text-slate-500">Prova a modificare i filtri o la ricerca.</p>
            <button
              onClick={() => {
                setFiltroCategoria('Tutte');
                setFiltroQuartiere('Tutti i quartieri');
                setSoloPreferiti(false);
                setRicerca('');
              }}
              className="text-xs font-semibold text-slate-900 underline cursor-pointer"
            >
              Mostra tutti gli annunci
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {annunciFiltrati.map((item) => {
              const isFav = preferiti.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden hover:border-slate-300 transition duration-150 flex flex-col justify-between group"
                >
                  <Link href={`/annuncio/${item.id}`} className="block flex-1">
                    <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                      {item.immagini && item.immagini.length > 0 ? (
                        <img
                          src={item.immagini[0]}
                          alt={item.titolo}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-medium">
                          Nessuna foto
                        </div>
                      )}

                      {/* Cuore Preferito */}
                      <button
                        type="button"
                        onClick={(e) => togglePreferito(e, item.id)}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center text-xs shadow-xs transition cursor-pointer"
                        title={isFav ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}
                      >
                        {isFav ? '❤️' : '🤍'}
                      </button>

                      {/* Prezzo o Stato */}
                      <span className="absolute top-2 right-2 bg-slate-950/85 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {item.venduto ? 'Scambiato' : item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <h2 className="font-semibold text-sm text-slate-950 line-clamp-1 group-hover:text-slate-700 transition">
                        {item.titolo}
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.quartiere}
                      </p>
                    </div>
                  </Link>

                  <div className="p-3.5 pt-0">
                    {item.venduto ? (
                      <div className="w-full bg-slate-50 text-slate-400 text-xs py-2 rounded-lg text-center font-medium">
                        Concluso
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleAzioneProtetta(
                            `/chat?annuncioId=${item.id}&venditore=${item.user_id || 'venditore_default'}`
                          )
                        }
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 rounded-lg transition cursor-pointer"
                      >
                        Contatta
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
