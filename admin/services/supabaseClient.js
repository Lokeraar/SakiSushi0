import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);