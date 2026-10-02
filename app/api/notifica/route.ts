import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = '8465244296:AAHw4wm2itXdXTD_Vser7CfFL7TNu_7YYSI';
const CHAT_ID = '986790951';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { titolo, prezzo, quartiere, contatto, descrizione, immagini } = data;

    const prezzoTesto = Number(prezzo) === 0 ? 'In regalo' : `${prezzo} €`;

    const testo = `
🔔 *NUOVO ANNUNCIO SU ZENA & GO!*

📦 *Titolo:* ${titolo}
💶 *Prezzo:* ${prezzoTesto}
📍 *Quartiere:* ${quartiere}
📞 *Contatto:* ${contatto}

📝 *Descrizione:*
${descrizione || 'Nessuna descrizione'}

👉 [Tocca qui per andare ad Approvare o Rifiutare](https://zena-go.vercel.app/admin)
    `.trim();

    // Se l'annuncio ha almeno una foto, invia una foto con didascalia
    if (immagini && immagini.length > 0) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          photo: immagini[0],
          caption: testo,
          parse_mode: 'Markdown',
        }),
      });
    } else {
      // Altrimenti invia messaggio solo testo
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: testo,
          parse_mode: 'Markdown',
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Errore notifica Telegram:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
