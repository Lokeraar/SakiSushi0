import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

// Cliente por defecto (sin token)
let supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función para reinicializar el cliente con un token JWT
export function setSupabaseToken(token) {
  if (token) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });
  } else {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  window.supabaseClient = supabase;
  console.log('🔐 Cliente Supabase actualizado' + (token ? ' con token' : ' (anónimo)'));
}

// Exportamos el cliente mutable
export { supabase };
