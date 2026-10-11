import { getSupabaseServer } from '@/lib/supabaseServer';
import BachecaClient, { Annuncio } from './BachecaClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return <BachecaClient annunciIniziali={[]} />;
  }

  const { data, error } = await supabase
    .from('annunci')
    .select('id, titolo, prezzo, quartiere, categoria, immagini, venduto, created_at, user_id, descrizione')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return <BachecaClient annunciIniziali={[]} />;
  }

  const annunciIniziali: Annuncio[] = data as Annuncio[];

  return <BachecaClient annunciIniziali={annunciIniziali} />;
}
