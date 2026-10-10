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
          email,
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
          email,
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
      setErrore(err.message || 'Si è verificato un errore.');
    } finally {
      setCaricamento(false);
    }
  };

  const accediConSocial = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrore(err.message || `Errore durante l'accesso con ${provider}.`);
    }
  };

  const inputStyle = { color: '#0f172a', backgroundColor: '#ffffff' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-2xl font-black text-emerald-600 tracking-tight mb-2">
            Zena &amp; Go
          </Link>
          <h2 className="text-lg font-bold text-slate-900">
            {modalita === 'login' ? 'Accedi per continuare' : 'Crea il tuo profilo Zena & Go'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {redirectPath.includes('chat')
              ? 'Accedi per contattare il venditore nella chat sicura.'
              : redirectPath.includes('pubblica')
              ? 'Accedi per inserire il tuo annuncio nel quartiere.'
              : 'Accedi per gestire messaggi e annunci a Genova.'}
          </p>
        </div>

        {/* Tab Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
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

        {/* Apple & Google Buttons */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => accediConSocial('apple')}
            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-xs"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.42-6.53-9.97-11.59-20.91-15.17-32.84-3.59-11.92-5.38-23.36-5.38-34.33 0-16.73 4.35-30.86 13.06-42.39 8.7-11.53 19.64-17.38 32.84-17.57 4.24 0 9.27 1.21 15.09 3.63 5.82 2.41 9.38 3.68 10.7 3.79 1.76-.23 5.48-1.52 11.16-3.87 5.68-2.35 10.6-3.4 14.75-3.17 14.88.88 26.69 6.27 35.43 16.16-13.04 7.9-19.44 18.66-19.19 32.28.25 10.77 4.41 19.89 12.48 27.35 4.35 4.02 9.27 7.02 14.75 9-2.46 7.4-5.59 15.12-9.4 23.16zM119.22 31.02c0-7.39 2.65-14.35 7.95-20.89 5.3-6.53 11.83-10.13 19.61-10.8 1.06 7.4-1.35 14.37-7.23 20.91-5.88 6.54-12.67 10.13-20.33 10.78z"/>
            </svg>
            Continua con Apple
          </button>

          <button
            type="button"
            onClick={() => accediConSocial('google')}
            className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.42l4.02-3.13z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"/>
            </svg>
            Continua con Google
          </button>
        </div>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[11px] text-slate-400">oppure con email</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {errore && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {errore}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
                placeholder="es. Cinefilo_Nervi, Andrea_Albaro..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              placeholder="iltuonome@email.com"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={caricamento}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs disabled:opacity-50 mt-2"
          >
            {caricamento
              ? 'Caricamento...'
              : modalita === 'login'
              ? 'Accedi'
              : 'Registrati gratis'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">
            ← Continua a curiosare in bacheca
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
