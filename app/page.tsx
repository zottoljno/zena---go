"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const QUARTIERI = [
  "Centro Storico",
  "Carignano / Foce",
  "Albaro / San Martino",
  "Castelletto / Manin",
  "San Fruttuoso / Marassi",
  "Staglieno / Val Bisagno",
  "Sampierdarena / San Teodoro",
  "Cornigliano / Sestri Ponente",
  "Pegli / Pra' / Voltri",
  "Quarto / Quinto / Nervi",
  "Pontedecimo / Bolzaneto / Val Polcevera",
];

interface Annuncio {
  id: number;
  created_at: string;
  titolo: string;
  prezzo: number;
  quartiere: string;
  luogo_ritiro?: string;
  descrizione?: string;
  contatto: string;
  immagini?: string[];
}

export default function Home() {
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [quartiereSelezionato, setQuartiereSelezionato] = useState("Tutti i quartieri");
  const [cerca, setCerca] = useState("");
  const [sezioneAttiva, setSezioneAttiva] = useState<"marketplace" | "profilo">("marketplace");

  // Recupera gli annunci veri dal database Supabase
  const caricaAnnunci = async () => {
    try {
      setCaricamento(true);
      const { data, error } = await supabase
        .from("annunci")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore nel recupero annunci:", error);
      } else if (data) {
        setAnnunci(data as Annuncio[]);
      }
    } catch (err) {
      console.error("Errore di rete:", err);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    caricaAnnunci();
  }, []);

  // Filtro combinato quartiere + barra di ricerca
  const annunciFiltrati = annunci.filter((annuncio) => {
    const corrispondeQuartiere =
      quartiereSelezionato === "Tutti i quartieri" ||
      annuncio.quartiere === quartiereSelezionato;
    const corrispondeTesto =
      annuncio.titolo.toLowerCase().includes(cerca.toLowerCase()) ||
      (annuncio.descrizione && annuncio.descrizione.toLowerCase().includes(cerca.toLowerCase()));
    return corrispondeQuartiere && corrispondeTesto;
  });

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-[#0d1b2a] pb-28">
      {/* Testata Navy minimale */}
      <header className="sticky top-0 z-30 bg-[#0d1b2a] text-white border-b border-[#1b263b] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight leading-none text-white">
              Zena &amp; Go
            </span>
            <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-1">
              Zero spedizioni • Solo a Genova
            </span>
          </div>

          <Link
            href="/pubblica"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95 uppercase tracking-wider inline-block"
          >
            + Vendi gratis
          </Link>
        </div>
      </header>

      {/* Contenuto Principale */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {sezioneAttiva === "marketplace" ? (
          <div className="space-y-4">
            {/* Barra di ricerca */}
            <div>
              <input
                type="text"
                placeholder="Cosa cerchi a Genova? (es. libro, bici...)"
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
                style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] shadow-xs font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Filtro Quartieri */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quartiere di scambio
                </p>
                <span className="text-[11px] text-slate-400 font-medium">Genova</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {["Tutti i quartieri", ...QUARTIERI].map((q) => {
                  const attivo = quartiereSelezionato === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuartiereSelezionato(q)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                        attivo
                          ? "bg-[#0d1b2a] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banner info */}
            <div className="bg-[#e8edf5] border border-[#cbd5e1] rounded-2xl p-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0d1b2a]">
                Zero spedizioni • Scambio a mano
              </h4>
              <p className="text-xs text-slate-700 font-normal leading-relaxed mt-1">
                Contatta direttamente chi vende via WhatsApp per mettervi d&apos;accordo sul punto di ritiro nel quartiere.
              </p>
            </div>

            {/* Lista Annunci */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Disponibili adesso ({annunciFiltrati.length})
                </h2>
                <button
                  type="button"
                  onClick={caricaAnnunci}
                  className="text-[11px] font-medium text-emerald-600 hover:underline"
                >
                  Aggiorna lista ↻
                </button>
              </div>

              {caricamento ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
                  Caricamento annunci in corso...
                </div>
              ) : annunciFiltrati.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    Nessun annuncio trovato in questo quartiere.
                  </p>
                  <Link
                    href="/pubblica"
                    className="mt-3 inline-block text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Sii il primo a pubblicarne uno!
                  </Link>
                </div>
              ) : (
                annunciFiltrati.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition"
                  >
                    <div className="flex gap-3">
                      {/* Foto principale */}
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        {item.immagini && item.immagini.length > 0 ? (
                          <img
                            src={item.immagini[0]}
                            alt={item.titolo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                            📷
                          </div>
                        )}

                        {item.immagini && item.immagini.length > 1 && (
                          <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            +{item.immagini.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Informazioni testo */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-sm font-bold text-[#0d1b2a] truncate leading-snug">
                              {item.titolo}
                            </h3>
                            <span className="text-base font-black text-[#0d1b2a] whitespace-nowrap">
                              {item.prezzo === 0 ? "In regalo" : `${item.prezzo} €`}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            📍 {item.quartiere}
                            {item.luogo_ritiro ? ` • Ritiro: ${item.luogo_ritiro}` : ""}
                          </p>
                          {item.descrizione && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {item.descrizione}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(item.created_at).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>

                          {item.contatto && (
                            <a
                              href={`https://wa.me/39${item.contatto.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs transition"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Griglietta altre foto caricate */}
                    {item.immagini && item.immagini.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
                        {item.immagini.map((foto, idx) => (
                          <img
                            key={idx}
                            src={foto}
                            alt=""
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Scheda Account */
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-[#0d1b2a] text-white flex items-center justify-center text-lg font-black tracking-tight">
                  U
                </div>
                <div>
                  <h2 className="text-base font-black text-[#0d1b2a]">Il tuo Profilo</h2>
                  <p className="text-xs font-medium text-slate-500">Zena &amp; Go • Genova</p>
                </div>
              </div>
              <div className="pt-4 space-y-2 text-xs text-slate-600">
                <p>
                  Pubblica e scambia oggetti di seconda mano nel tuo quartiere a Genova senza commissioni o spedizioni.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigazione inferiore */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-2 z-20 flex justify-around max-w-md mx-auto shadow-md">
        <button
          type="button"
          onClick={() => setSezioneAttiva("marketplace")}
          className={`flex flex-col items-center gap-1 transition ${
            sezioneAttiva === "marketplace" ? "text-[#0d1b2a] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider">Mercatino</span>
        </button>

        <button
          type="button"
          onClick={() => setSezioneAttiva("profilo")}
          className={`flex flex-col items-center gap-1 transition ${
            sezioneAttiva === "profilo" ? "text-[#0d1b2a] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider">Account</span>
        </button>
      </nav>
    </main>
  );
}
