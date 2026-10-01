'use client';

import { useState } from 'react';
import './globals.css';

type LegalModalType = 'terms' | 'disclaimer' | 'safety' | null;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [activeModal, setActiveModal] = useState<LegalModalType>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col justify-between bg-white text-slate-900 antialiased">
        <main className="flex-grow">
          {children}
        </main>

        <footer className="mt-20 border-t border-slate-200 bg-slate-50 text-slate-600">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900">
                    Zena <span className="text-emerald-600">&amp;</span> Go
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Genova
                  </span>
                </div>
                <p className="text-sm text-slate-500 max-w-md">
                  La bacheca locale per comprare, vendere e scambiare a Genova quartiere per quartiere. 
                  Semplice, diretto e a chilometro zero.
                </p>
                <p className="text-xs text-slate-400">
                  © 2026 Zena &amp; Go. Tutti i diritti riservati.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Community
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('safety')}
                      className="hover:text-emerald-600 transition-colors text-left font-medium text-slate-700 cursor-pointer"
                    >
                      🛡️ Consigli per incontri sicuri
                    </button>
                  </li>
                  <li>
                    <span className="text-xs text-slate-400">
                      Solo scambi a mano nei quartieri genovesi
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Note Legali
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('terms')}
                      className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                    >
                      Termini di Servizio
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('disclaimer')}
                      className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                    >
                      Esonero di Responsabilità
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400 text-center sm:text-left">
              Zena &amp; Go è una bacheca tecnica autonoma di annunci tra privati. Non gestisce pagamenti, spedizioni o transazioni economiche dirette.
            </div>
          </div>
        </footer>

        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl">
              
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>

              {activeModal === 'safety' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    🛡️ Linee Guida per Scambi Sicuri a Genova
                  </h2>
                  <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                    <p className="font-medium text-slate-800">
                      Zena &amp; Go promuove lo scambio a mano locale. Per garantire un&apos;esperienza serena, segui sempre queste regole:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        <strong>Incontrati sempre di giorno e in luoghi pubblici frequentati:</strong> Scegli piazze principali (es. Piazza De Ferrari, Piazza della Vittoria), stazioni ferroviarie (Brignole, Principe) o davanti a un bar aperto. Evita vicoli isolati o interni privati.
                      </li>
                      <li>
                        <strong>Ispeziona l&apos;oggetto prima di pagare:</strong> Verifica che il prodotto sia conforme alla descrizione e funzionante prima di concludere lo scambio.
                      </li>
                      <li>
                        <strong>Nessun anticipo di denaro:</strong> Non inviare mai caparre o pagamenti anticipati con ricariche di carte prepagate o bonifici istantanei a sconosciuti.
                      </li>
                      <li>
                        <strong>Fatti accompagnare:</strong> Quando ritiri oggetti di valore (elettronica, smartphone, bici), porta con te un amico o un familiare.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    Termini e Condizioni d&apos;Uso
                  </h2>
                  <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                    <p>
                      1. <strong>Natura del servizio:</strong> Zena &amp; Go offre uno spazio digitale per facilitare la pubblicazione e la consultazione di annunci tra privati domiciliati o residenti a Genova e dintorni.
                    </p>
                    <p>
                      2. <strong>Ruolo di Mero Intermediario:</strong> La piattaforma agisce quale mero fornitore di spazio telematico (hosting provider ai sensi del Regolamento UE Digital Services Act). Non interviene nelle trattative, non stabilisce i prezzi e non riceve provvigioni sulle vendite.
                    </p>
                    <p>
                      3. <strong>Beni vietati:</strong> È severamente vietato pubblicare annunci relativi a beni contraffatti, armi, sostanze illecite, animali protetti o qualsiasi materiale che violi le leggi italiane vigenti. Gli annunci non conformi saranno rimossi tempestivamente.
                    </p>
                    <p>
                      4. <strong>Dati personali e contatto:</strong> Gli utenti acconsentono a rendere visibili i dati inseriti volontariamente nell&apos;annuncio al solo scopo di essere contattati per la compravendita.
                    </p>
                  </div>
                </div>
              )}

              {activeModal === 'disclaimer' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    Esonero di Responsabilità (Disclaimer)
                  </h2>
                  <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                    <p>
                      1. <strong>Autonomia delle parti:</strong> Qualsiasi accordo verbale, scritto o economico intercorre esclusivamente tra l&apos;acquirente e il venditore. Zena &amp; Go non è parte contrattuale di alcuna transazione.
                    </p>
                    <p>
                      2. <strong>Garanzie sui beni:</strong> La piattaforma non effettua perizie, controlli fisici o attestazioni sull&apos;autenticità, qualità, integrità o provenienza lecita dei beni scambiati.
                    </p>
                    <p>
                      3. <strong>Incontri e condotta degli utenti:</strong> Zena &amp; Go declina ogni responsabilità civile e penale per danni, dispute, inadempimenti o incidenti derivanti dagli incontri di persona o dalla condotta individuale degli utenti.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Ho capito
                </button>
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
