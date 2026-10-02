const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    try {
      const { error } = await supabase.from('annunci').insert([
        {
          titolo,
          prezzo: parseFloat(prezzo) || 0,
          quartiere,
          luogo_ritiro: luogoRitiro,
          descrizione,
          contatto,
          immagini,
          stato: 'approvato',
        },
      ]);

      if (error) {
        throw error;
      }

      // Invia la notifica Telegram al moderatore (non blocca se c'è un errore di rete)
      fetch('/api/notifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo,
          prezzo,
          quartiere,
          contatto,
        }),
      }).catch((err) => console.error('Errore notifica:', err));

      setInviato(true);
    } catch (err: any) {
      setErrore(err.message || 'Errore durante la pubblicazione.');
    } finally {
      setCaricamento(false);
    }
  };
