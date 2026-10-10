'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const QUARTIERI_GENOVA = [
  'Centro Storico',
  'Carignano / Foce',
  'Albaro / San Martino',
  'Castelletto / Manin',
  'San Fruttuoso / Marassi',
  'Staglieno / Val Bisagno',
  'Sampierdarena / San Teodoro',
  'Cornigliano / Sestri Ponente',
  'Pegli / Pra\' / Voltri',
  'Quarto / Quinto / Nervi',
  'Pontedecimo / Bolzaneto / Val Polcevera',
];

const PAROLE_VIETATE = [
  'arma', 'armi', 'pistola', 'fucile', 'coltello', 'munizioni',
  'droga', 'erba', 'fumo', 'cocaina', 'hashish', 'marijuana', 'cannabis', 'thc', 'cbd',
  'farmaco', 'medicinale', 'ricetta', 'ansiolitico', 'psicofarmaco', 'viagra',
  'replica', 'contraffatto', 'falso rolex', 'pezzotto', 'iptv',
  'prestito', 'investimento', 'bonifico immediato', 'crypto'
];

export default function PubblicaAnnuncio() {
  const [titolo, setTitolo] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [quartiere, setQuartiere] = useState(QUARTIERI_GENOVA[0]);
  const [descrizione, setDescrizione] = useState('');
  const [luogoRitiro, setLuogoRitiro] = useState('');
  const [immagini, setImmagini] = useState<string[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviato, setInviato] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('zena_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('zena_user_id', id);
    }
    setUserId(id);
  }, []);

  const inputStyle = {
    color: '#0f172a',
    backgroundColor: '#ffffff',
  };

  const gestisciFotoMultiple = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const spazioRimanente = 10 - immagini.length;
    const fileDaCaricare = fileArray.slice(0, spazioRimanente);

    fileDaCaricare.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImmagini((prev) => {
          if (prev.length >= 10) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const rimuoviFoto = (indice: number) => {
    setImmagini((prev) => prev.filter((_, i) => i !== indice));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    // Filtro parole vietate
    const testoCompleto = `${titolo} ${descrizione}`.toLowerCase();
    const parolaTrovata = PAROLE_VIETATE.find((parola) => {
      const regex = new RegExp(`\\b${parola}\\b`, 'i');
      return regex.test(testoCompleto);
    });

    if (parolaTrovata) {
      setCaricamento(false);
      setErrore(`L'annuncio non può essere pubblicato perché contiene termini non ammessi ("${parolaTrovata}").`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('annunci')
        .insert([
          {
            titolo,
            prezzo: parseFloat(prezzo) || 0,
            quartiere,
            luogo_ritiro: luogoRitiro,
            descrizione,
            immagini,
            stato: 'approvato',
            segnalato: false,
            user_id: userId,
          },
        ])
