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
  immagini?: string[];
  venduto?: boolean;
  created_at: string;
}

export default function ProfiloPage() {
  const router = useRouter();
  const [utente, setUtente] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [mieiAnnunci, setMieiAnnunci] = useState<Annuncio[]>([]);
  const [annunciPreferiti, setAnnunciPreferiti] = useState<Annuncio[]>([]);
  const [schedaAttiva, setSchedaAttiva] = useState<'miei' | 'preferiti'>('miei');
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?redirect=/profilo');
        return;
      }

      setUtente(session.user);
      const nick =
        session.user.user_metadata?.nickname ||
        session.user.email?.split('@')[0] ||
        'Genovese';
      setNickname(nick);

      await Promise.all([
        caricaMieiAnnunci(session.user.id),
        caricaPreferiti(),
      ]);

      setCaricamento(false);
    };

    init();
  }, [router]);

  const caricaMieiAnnunci = async (userId: string) => {
    const { data } = await supabase
      .from('annunci')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setMieiAnnunci(data as Annuncio[]);
    }
  };

  const caricaPreferiti = async () => {
    try {
      const salvati = localStorage.getItem('zena_preferiti');
      if (!salvati) return;
      const ids: number[] = JSON.parse(salvati);
      if (!Array.isArray(ids) || ids.length === 0) return;

      const { data } = await supabase
        .from('annunci')
        .select('*')
        .in('id', ids);

      if (data) {
        setAnnunciPreferiti(data as Annuncio[]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVenduto = async (id: number, statoAttuale?: boolean) => {
    const nuovoStato = !statoAttuale;

    setMieiAnnunci((prev) =>
      prev.map((a) => (a.id === id ? { ...a, venduto: nuovoStato } : a))
    );

    await supabase
      .from('annunci')
      .update({ venduto: nuovoStato })
      .eq('id', id);
  };

  const eliminaAnnuncio = async (id: number) => {
    const conferma = window.confirm('Vuoi davvero eliminare questo annuncio?');
    if (!conferma) return;

    setMieiAnnunci((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('annunci').delete().eq('id', id);
  };

  const rimuoviPreferito = (id: number) => {
    const nuovaLista = annunciPreferiti.filter((a) => a.id !== id);
    setAnnunciPreferiti(nuovaLista);
    try {
      const ids = nuovaLista.map((a) => a.id);
      localStorage.setItem('zena_preferiti', JSON.stringify(ids));
    } catch {}
  };

  const disconnetti = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('zena_user_id');
    localStorage.removeItem('zena_nickname');
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-blue-900 flex items-center gap-1"
          >
            ← Bacheca Zena &amp; Go
          </Link>
          <span className="font-extrabold text-slate-900 text-sm">Il tuo Profilo</span>
          <button
            onClick={disconnetti}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Esci
          </button>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Scheda Utente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-800 text-white font-black text-lg flex items-center justify-center shadow-xs">
              {nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900">{nickname}</h1>
              <p className="text-xs text-slate-500">{utente?.email}</p>
            </div>
          </div>

          <Link
            href="/pubblica"
            className="bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
          >
            <span>+</span>
            <span>Nuovo Annuncio</span>
          </Link>
        </div>

        {/* Tab di navigazione tra Miei Annunci e Preferiti */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => setSchedaAttiva('miei')}
            className={`pb-3 text-xs font-bold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              schedaAttiva === 'miei'
                ? 'border-blue-800 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📦 I tuoi annunci</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded-full">
              {mieiAnnunci.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSchedaAttiva('preferiti')}
            className={`pb-3 text-xs font-bold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              schedaAttiva === 'preferiti'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>❤️ Preferiti salvati</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded-full">
              {annunciPreferiti.length}
            </span>
          </button>
        </div>

        {/* Contenuto Scheda Selezionata */}
        {caricamento ? (
          <div className="text-center py-12 text-slate-400 text-xs">Caricamento dati...</div>
        ) : schedaAttiva === 'miei' ? (
          <section className="space-y-3">
            {mieiAnnunci.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <span className="text-3xl block">📦</span>
                <p className="text-xs text-slate-500 font-medium">Non hai ancora pubblicato nessun oggetto.</p>
                <Link
                  href="/pubblica"
                  className="inline-block text-xs font-bold text-blue-800 hover:underline pt-1"
                >
                  Pubblica il tuo primo annuncio
                </Link>
              </div>
            ) : (
              mieiAnnunci.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                      {item.immagini && item.immagini.length > 0 ? (
                        <img src={item.immagini[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
                      )}
                      {item.venduto && (
                        <span className="absolute inset-0 bg-slate-900/70 text-white text-[9px] font-black uppercase flex items-center justify-center text-center px-1">
                          Scambiato
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/annuncio/${item.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-800 truncate"
                        >
                          {item.titolo}
                        </Link>
                        {item.venduto && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            Chiuso
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`} • {item.quartiere}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleVenduto(item.id, item.venduto)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                        item.venduto
                          ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {item.venduto ? '↩️ Rimetti disponibile' : '🤝 Segna come scambiato'}
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminaAnnuncio(item.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                      title="Elimina definitivamente"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="space-y-3">
            {annunciPreferiti.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <span className="text-3xl block">❤️</span>
                <p className="text-xs text-slate-500 font-medium">Non hai ancora nessun annuncio salvato tra i preferiti.</p>
                <Link
                  href="/"
                  className="inline-block text-xs font-bold text-blue-800 hover:underline pt-1"
                >
                  Sfoglia la bacheca e aggiungi annunci con il cuoricino
                </Link>
              </div>
            ) : (
              annunciPreferiti.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                      {item.immagini && item.immagini.length > 0 ? (
                        <img src={item.immagini[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
                      )}
                      {item.venduto && (
                        <span className="absolute inset-0 bg-slate-900/70 text-white text-[9px] font-black uppercase flex items-center justify-center text-center px-1">
                          Scambiato
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/annuncio/${item.id}`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-800 truncate block"
                      >
                        {item.titolo}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.prezzo === 0 ? 'Gratis' : `${item.prezzo} €`} • {item.quartiere}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      href={`/annuncio/${item.id}`}
                      className="text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-xl transition shadow-xs"
                    >
                      Vedi annuncio
                    </Link>

                    <button
                      type="button"
                      onClick={() => rimuoviPreferito(item.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition"
                      title="Rimuovi dai preferiti"
                    >
                      ✕ Rimuovi
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
