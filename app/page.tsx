import { supabaseServer } from '@/lib/supabaseServer';
import BachecaClient, { Annuncio } from './BachecaClient';

// Cache Edge: rigenera i dati in background ogni 30 secondi
export const revalidate = 30;

export default async function HomePage() {
  const { data } = await supabaseServer
    .from('annunci')
    .select('id, titolo, prezzo, quartiere, categoria, immagini, venduto, created_at, user_id, descrizione')
    .order('created_at', { ascending: false });

  const annunciIniziali: Annuncio[] = (data as Annuncio[]) || [];

  return <BachecaClient annunciIniziali={annunciIniziali} />;
}
