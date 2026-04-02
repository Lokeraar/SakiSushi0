// admin/services/menuService.js
import { supabaseClient } from './supabaseClient.js';

export async function fetchMenu() {
    const { data, error } = await supabaseClient.client
        .from('menu')
        .select('id, nombre, categoria, subcategoria, precio, descripcion, imagen, ingredientes, disponible, stock, stock_maximo');
    if (error) throw error;
    return data || [];
}
