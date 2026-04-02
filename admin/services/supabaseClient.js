// admin/services/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

let _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Objeto contenedor con getter para siempre obtener la instancia actual
export const supabaseClient = {
    get client() {
        return _client;
    },
    // Método para actualizar el cliente con un token
    setToken(token) {
        if (token) {
            _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { persistSession: false }
            });
        } else {
            _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        console.log('🔐 Cliente Supabase actualizado' + (token ? ' con token' : ' (anónimo)'));
    }
};

// Para compatibilidad con código existente que importaba { supabase }
export const supabase = supabaseClient.client;
