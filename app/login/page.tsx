'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [modalita, setModalita] = useState<'login' | 'registrazione'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    try {
      if (modalita === 'registrazione') {
        if (!nickname.trim()) {
          throw new Error('Inserisci un nickname per la community.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              nickname: nickname.trim(),
            },
          },
        });

        if (error) throw error;
        if (data.user) {
          localStorage.setItem('zena_user_id', data.user.id);
          localStorage.setItem('zena_nickname', nickname.trim());
          router.push(redirectPath);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        if (data.user) {
          const nick = data.user.user_metadata?.nickname || email.split('@')[0];
          localStorage.setItem('zena_user_id', data.user.id);
          localStorage.setItem('zena_nickname', nick);
          router.push(redirectPath);
        }
      }
    } catch (err: any) {
      setErrore(err.message || 'Credenziali non valide o errore durante l\'operazione.');
    } finally {
      setCaricamento(false);
    }
  };

  const inputStyle = { color: '#0f172a', backgroundColor: '#ffffff' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-2xl font-black text-emerald-600 tracking-tight mb-2">
            Zena &amp; Go
          </Link>
          <h2 className="text-lg font-bold text-slate-900">
            {modalita === 'login' ? 'Accedi al tuo profilo' : 'Crea il tuo profilo Zena & Go'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {redirectPath.includes('chat')
              ? 'Accedi per contattare il venditore nella chat interna.'
              : redirectPath.includes('pubblica')
              ? 'Accedi per inserire annunci a Genova.'
              : 'Accedi per gestire messaggi e scambi nel tuo quartiere.'}
          </p>
        </div>

        {/* Switch Login / Registrati */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setModalita('login'); setErrore(''); }}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${
              modalita === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setModalita('registrazione'); setErrore(''); }}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${
              modalita === 'registrazione' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Registrati
          </button>
        </div>

        {errore && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {errore}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {modalita === 'registrazione' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nickname nella community *
              </label>
              <input
                type="text"
                required
                style={inputStyle}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="es. Daniele_Genova, Cinefilo_Nervi..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="latuaemail@esempio.com"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 6 caratteri"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={caricamento}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-xs disabled:opacity-50 mt-2"
          >
            {caricamento
              ? 'Caricamento in corso...'
              : modalita === 'login'
              ? 'Accedi a Zena & Go'
              : 'Crea account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">
            ← Torna alla bacheca
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500">Caricamento...</div>}>
      <LoginContent />
    </Suspense>
  );
}
