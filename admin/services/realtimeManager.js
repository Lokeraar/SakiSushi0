// admin/services/realtimeManager.js
import { supabaseClient } from './supabaseClient.js';

const channels = new Map();

export function subscribe(table, callback) {
    if (channels.has(table)) return;
    const channel = supabaseClient.client
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => callback(payload))
        .subscribe();
    channels.set(table, channel);
}

export function unsubscribe(table) {
    const channel = channels.get(table);
    if (channel) {
        supabaseClient.client.removeChannel(channel);
        channels.delete(table);
    }
}
