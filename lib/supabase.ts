import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = 'https://xzepjdvwofbpjloadzwu.supabase.co';
const supabaseAnonKey: string = 'process.env.SUPABASE_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
