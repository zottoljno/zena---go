import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TELEGRAM_TOKEN = '8983049225:AAHBrE3uLwTXtdcv2z9yA9aeuK5dkzjmVNs';
const ADMIN_CHAT_ID = 986790951;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Se l'admin preme il pulsante inline "ELIMINA"
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const fromId = callbackQuery.from?.id;
      const callbackData = callbackQuery.data;
      const messageId = callbackQuery.message?.message_id;

      // Sicurezza: solo il tuo account Telegram può eseguire l'eliminazione
      if (fromId !== ADMIN_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: 'Non sei autorizzato.',
            show_alert: true,
          }),
        });
        return NextResponse.json({ ok: true });
      }

      if (callbackData && callbackData.startsWith('delete_')) {
        const idAnnuncio = callbackData.replace('delete_', '');

        // Cancella l'annuncio da Supabase
        const { error } = await supabase.from('annunci').delete().eq('id', idAnnuncio);

        if (error) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: "Errore durante l'eliminazione: " + error.message,
              show_alert: true,
            }),
          });
        } else {
          // Feedback popup su Telegram
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: 'Annuncio eliminato da Zena & Go!',
            }),
          });

          // Modifica il messaggio Telegram togliendo il bottone e mostrando che è stato cancellato
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              message_id: messageId,
              text: `${callbackQuery.message?.text}\n\n❌ *STATO: ELIMINATO DAL MODERATORE*`,
              parse_mode: 'Markdown',
            }),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Errore webhook Telegram:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
