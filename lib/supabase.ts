import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = 'https://xzepjdvwofbpjloadzwu.supabase.co';
const supabaseAnonKey: string = 'sb_publishable_9n-cci3VYCg-aESvE40y8Q_norxHTqZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
