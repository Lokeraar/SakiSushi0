import { supabase } from './supabaseClient.js';

export async function fetchMenu() {
  const { data, error } = await supabase
    .from('menu')
    .select('id, nombre, categoria, subcategoria, precio, descripcion, imagen, ingredientes, disponible, stock, stock_maximo');
  if (error) throw error;
  return data || [];
}