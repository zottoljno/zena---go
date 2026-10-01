"use client";

import { useState } from "react";

const QUARTIERI = [
  "Centro Storico",
  "Foce",
  "Albaro",
  "San Fruttuoso",
  "Marassi",
  "Sampierdarena",
  "Sestri Ponente",
  "Cornigliano",
  "Rivarolo",
  "Bolzaneto",
  "Pontedecimo",
  "Castelletto",
  "Molassana",
  "Struppa",
  "Quarto",
  "Quinto",
  "Nervi",
  "Pegli",
  "Pra'",
  "Voltri"
];

interface Annuncio {
  id: number;
  titolo: string;
  prezzo: number;
  quartiere: string;
  contatto: string;
  scadenza: string;
  stato: "attivo" | "scaduto";
  immagini: string[];
}

const ANNUNCI_INIZIALI: Annuncio[] = [
  {
    id: 1,
    titolo: "Bicicletta da passeggio vintage",
    prezzo: 40,
    quartiere: "San Fruttuoso",
    contatto: "3401234567",
    scadenza: "Scade tra 2 giorni",
    stato: "attivo",
    immagini: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: 2,
    titolo: "Tavolino da salotto in legno massello",
    prezzo: 15,
    quartiere: "Foce",
    contatto: "3339876543",
    scadenza: "Scade domani",
    stato: "attivo",
    immagini: [
      "https://images.unsplash.com/photo-1533090161767-e6ffed986b88?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: 3,
    titolo: "Coppia manubri gommati 10kg",
    prezzo: 20,
    quartiere: "Marassi",
    contatto: "3201122334",
    scadenza: "Scaduto",
    stato: "scaduto",
    immagini: [
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80"
    ]
  }
];

export default function Home() {
  const [annunci, setAnnunci] = useState<Annuncio[]>(ANNUNCI_INIZIALI);
  const [quartiereSelezionato, setQuartiereSelezionato] = useState("Tutti i quartieri");
  const [cerca, setCerca] = useState("");
  const [sezioneAttiva, setSezioneAttiva] = useState<"marketplace" | "profilo">("marketplace");

  const [utente] = useState({
    nome: "Daniele",
    telefono: "340 0000000",
    quartierePreferito: "San Fruttuoso"
  });

  const [mostraModale, setMostraModale] = useState(false);

  const [nuovoTitolo, setNuovoTitolo] = useState("");
  const [nuovoPrezzo, setNuovoPrezzo] = useState("");
  const [nuovoQuartiere, setNuovoQuartiere] = useState(QUARTIERI[0]);
  const [nuovoContatto, setNuovoContatto] = useState(utente.telefono);
  const [nuoveImmagini, setNuoveImmagini] = useState<string[]>([]);

  const handleCaricaFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    const urls = fileList.map((file) => URL.createObjectURL(file));

    setNuoveImmagini((prev) => [...prev, ...urls].slice(0, 10));
  };

  const rimuoviFoto = (indexToRemove: number) => {
    setNuoveImmagini((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRepostaGratis = (id: number) => {
    setAnnunci((prev) =>
      prev.map((annuncio) =>
        annuncio.id === id
          ? {
              ...annuncio,
              stato: "attivo",
              scadenza: "Scade tra 3 giorni (Gratis)"
            }
          : annuncio
      )
    );
  };

  const annunciFiltrati = annunci
    .filter((a) => a.stato === "attivo")
    .filter((annuncio) => {
      const corrispondeQuartiere =
        quartiereSelezionato === "Tutti i quartieri" ||
        annuncio.quartiere === quartiereSelezionato;
      const corrispondeTesto = annuncio.titolo
        .toLowerCase()
        .includes(cerca.toLowerCase());
      return corrispondeQuartiere && corrispondeTesto;
    });

  const handleCreaAnnuncio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoTitolo.trim() || !nuovoPrezzo) return;

    const nuovoItem: Annuncio = {
      id: Date.now(),
      titolo: nuovoTitolo.trim(),
      prezzo: Number(nuovoPrezzo),
      quartiere: nuovoQuartiere,
      contatto: nuovoContatto.trim(),
      scadenza: "Scade tra 3 giorni (Gratis)",
      stato: "attivo",
      immagini: nuoveImmagini
    };

    setAnnunci([nuovoItem, ...annunci]);

    setNuovoTitolo("");
    setNuovoPrezzo("");
    setNuoveImmagini([]);
    setMostraModale(false);
  };

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

          <button
            onClick={() => setMostraModale(true)}
            className="bg-white hover:bg-slate-100 text-[#0d1b2a] font-black text-xs px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95 uppercase tracking-wider"
          >
            + Vendi gratis
          </button>
        </div>
      </header>

      {/* Contenuto Principale */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {sezioneAttiva === "marketplace" ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Cosa cerchi a Genova? (es. bici, libri...)"
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] shadow-xs font-medium placeholder:text-slate-400"
              />
            </div>

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

            <div className="bg-[#e8edf5] border border-[#cbd5e1] rounded-2xl p-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0d1b2a]">
                Zero spedizioni • Annunci a scadenza (3 giorni)
              </h4>
              <p className="text-xs text-slate-700 font-normal leading-relaxed mt-1">
                Ogni annuncio resta attivo 3 giorni. Se non hai ancora venduto, <strong>puoi repostarlo gratis quante volte vuoi</strong> per confermare che l&apos;oggetto è ancora disponibile.
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Disponibili adesso ({annunciFiltrati.length})
                </h2>
                <span className="text-[11px] font-medium text-slate-500">Solo scambio a mano</span>
              </div>

              {annunciFiltrati.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">Nessun articolo attivo in questo quartiere.</p>
                </div>
              ) : (
                annunciFiltrati.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        {item.immagini && item.immagini.length > 0 ? (
                          <img
                            src={item.immagini[0]}
                            alt={item.titolo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                            Foto
                          </div>
                        )}

                        {item.immagini && item.immagini.length > 1 && (
                          <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            +{item.immagini.length - 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-sm font-bold text-[#0d1b2a] truncate leading-snug">
                              {item.titolo}
                            </h3>
                            <span className="text-base font-black text-[#0d1b2a] whitespace-nowrap">
                              {item.prezzo} €
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            📍 {item.quartiere}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-semibold text-slate-500">
                            ⏳ {item.scadenza}
                          </span>
                          {item.contatto && (
                            <a
                              href={`https://wa.me/39${item.contatto.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#0d1b2a] hover:bg-[#1b263b] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

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
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-[#0d1b2a] text-white flex items-center justify-center text-lg font-black tracking-tight">
                  {utente.nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-black text-[#0d1b2a]">{utente.nome}</h2>
                  <p className="text-xs font-medium text-slate-500">Genova • {utente.quartierePreferito}</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dati di contatto
                </h3>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Telefono / WhatsApp</span>
                  <span className="font-semibold text-[#0d1b2a]">{utente.telefono}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Quartiere preferito</span>
                  <span className="font-semibold text-[#0d1b2a]">{utente.quartierePreferito}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  I tuoi annunci in vendita
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {annunci.length} totali
                </span>
              </div>

              <div className="space-y-3">
                {annunci.map((annuncio) => (
                  <div
                    key={annuncio.id}
                    className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0d1b2a] truncate">
                        {annuncio.titolo}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {annuncio.prezzo} € • {annuncio.quartiere}
                      </p>
                      <p className={`text-[10px] font-bold mt-1 ${
                        annuncio.stato === "attivo" ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        {annuncio.stato === "attivo" ? annuncio.scadenza : "Scaduto dopo 3 giorni"}
                      </p>
                    </div>

                    <div>
                      {annuncio.stato === "scaduto" ? (
                        <button
                          onClick={() => handleRepostaGratis(annuncio.id)}
                          className="bg-[#0d1b2a] hover:bg-[#1b263b] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition"
                        >
                          Reposta Gratis
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                          Attivo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigazione inferiore con icone SVG pulite */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-2 z-20 flex justify-around max-w-md mx-auto shadow-md">
        <button
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

      {/* Modale Inserimento Annuncio Fino a 10 Foto */}
      {mostraModale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0d1b2a] tracking-tight">
                  Pubblica su Zena &amp; Go
                </h3>
                <p className="text-xs text-slate-500 font-medium">Gratis per 3 giorni • Repost sempre gratuito</p>
              </div>
              <button
                onClick={() => setMostraModale(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreaAnnuncio} className="space-y-3.5 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Foto dell&apos;oggetto ({nuoveImmagini.length}/10)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Max 10 foto</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {nuoveImmagini.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                      <img src={img} alt="anteprima" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => rimuoviFoto(index)}
                        className="absolute top-1 right-1 bg-black/75 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {nuoveImmagini.length < 10 && (
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0d1b2a] bg-slate-50 rounded-xl cursor-pointer transition">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5">Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleCaricaFoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Cosa vendi?
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Casco moto, Chitarra, Scarpe..."
                  value={nuovoTitolo}
                  onChange={(e) => setNuovoTitolo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Prezzo (€)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25"
                    value={nuovoPrezzo}
                    onChange={(e) => setNuovoPrezzo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Quartiere
                  </label>
                  <select
                    value={nuovoQuartiere}
                    onChange={(e) => setNuovoQuartiere(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] bg-white font-medium"
                  >
                    {QUARTIERI.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  WhatsApp o Telefono
                </label>
                <input
                  type="tel"
                  placeholder="Es. 3401234567"
                  value={nuovoContatto}
                  onChange={(e) => setNuovoContatto(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b2a] font-medium"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                Durata: <strong>3 giorni gratis</strong>. Se non hai ancora venduto, puoi riattivarlo con un clic gratis dalla scheda Account.
              </div>

              <button
                type="submit"
                className="w-full bg-[#0d1b2a] hover:bg-[#1b263b] text-white font-black py-3 rounded-xl shadow-md transition uppercase tracking-wider text-xs"
              >
                Metti in vendita subito
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}