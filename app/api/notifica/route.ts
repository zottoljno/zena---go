import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = '8983049225:AAHBrE3uLwTXtdcv2z9yA9aeuK5dkzjmVNs';
const CHAT_ID = '986790951';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { titolo, prezzo, quartiere, contatto } = data;

    const prezzoTesto = Number(prezzo) === 0 ? 'Gratis (In regalo)' : `${prezzo} €`;

    const testo = `
🔔 *NUOVO ANNUNCIO SU ZENA & GO!*

📦 *Titolo:* ${titolo}
💶 *Prezzo:* ${prezzoTesto}
📍 *Quartiere:* ${quartiere}
📞 *Contatto:* ${contatto || 'N/D'}

👉 [Apri il Pannello Moderatore](https://zena-go.vercel.app/admin)
    `.trim();

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: testo,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Errore invio notifica:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
