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

      await caricaMieiAnnunci(session.user.id);
      setCaricamento(false);
    };

    init();
  }, [router]);

  const caricaMieiAnnunci = async (userId: string) => {
    const { data, error } = await supabase
      .from('annunci')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMieiAnnunci(data as Annuncio[]);
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

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              I tuoi annunci ({mieiAnnunci.length})
            </h2>
          </div>

          {caricamento ? (
            <div className="text-center py-12 text-slate-400 text-xs">Caricamento tuoi annunci...</div>
          ) : mieiAnnunci.length === 0 ? (
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
            <div className="space-y-3">
              {mieiAnnunci.map((item) => (
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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
