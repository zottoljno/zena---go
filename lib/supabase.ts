import { createClient } from '@supabase/supabase-js';

// Incolla il tuo URL e la tua chiave al posto dei testi tra virgolette:
const supabaseUrl = 'https://xzepjdvwofbpjloadzwu.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
