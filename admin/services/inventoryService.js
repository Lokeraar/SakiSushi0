// admin/services/inventoryService.js
import { supabaseClient } from './supabaseClient.js';

export async function fetchInventory() {
    const { data, error } = await supabaseClient.client
        .from('inventario')
        .select('id, nombre, stock, reservado, unidad_base, minimo, precio_costo, precio_unitario');
    if (error) throw error;
    return data || [];
}

export async function updateStockAtomic(id, delta) {
    const { data, error } = await supabaseClient.client.rpc('update_stock_atomic', {
        p_ingredient_id: id,
        p_delta: delta
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data;
}
