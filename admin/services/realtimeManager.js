import { supabase } from './supabaseClient.js';

const channels = new Map();

export function subscribe(table, callback) {
  if (channels.has(table)) return;
  const channel = supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, payload => callback(payload))
    .subscribe();
  channels.set(table, channel);
}

export function unsubscribe(table) {
  const channel = channels.get(table);
  if (channel) {
    supabase.removeChannel(channel);
    channels.delete(table);
  }
}