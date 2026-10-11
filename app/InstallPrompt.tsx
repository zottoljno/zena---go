'use client';

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mostraBanner, setMostraBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [mostraGuidaIOS, setMostraGuidaIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostraBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isIosDevice) {
      const bannerChiuso = sessionStorage.getItem('zena_pwa_dismissed');
      if (!bannerChiuso) {
        setMostraBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installaApp = async () => {
    if (isIOS) {
      setMostraGuidaIOS(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setMostraBanner(false);
    }
    setDeferredPrompt(null);
  };

  const chiudiBanner = () => {
    setMostraBanner(false);
    sessionStorage.setItem('zena_pwa_dismissed', 'true');
  };

  if (!mostraBanner) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border-b border-blue-700/50 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl">📲</span>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Installa l&apos;app di Zena &amp; Go</p>
            <p className="text-[10px] text-blue-200 truncate">Accesso rapido dalla schermata Home</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installaApp}
            className="bg-white text-blue-900 hover:bg-blue-50 text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            Installa
          </button>
          <button
            onClick={chiudiBanner}
            className="text-blue-300 hover:text-white text-xs font-bold p-1 cursor-pointer"
            title="Chiudi"
          >
            ✕
          </button>
        </div>
      </div>

      {mostraGuidaIOS && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Come installare su iPhone</h3>
              <button
                onClick={() => setMostraGuidaIOS(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside leading-relaxed">
              <li>
                Tocca il tasto <strong>Condividi</strong> in Safari (il quadrato con la freccia verso l&apos;alto in basso).
              </li>
              <li>
                Scorri le opzioni e tocca <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong> (icona col <strong>+</strong>).
              </li>
              <li>
                Tocca <strong>Aggiungi</strong> in alto a destra: troverai l&apos;icona di Zena &amp; Go tra le tue app!
              </li>
            </ol>

            <button
              onClick={() => setMostraGuidaIOS(false)}
              className="w-full bg-blue-800 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-blue-900 transition cursor-pointer"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}
