// sw.js — Service Worker para Saki Sushi
// Maneja: notificaciones push entrantes (vía VAPID) y
//         notificaciones locales solicitadas por la página cuando está en segundo plano.

const CACHE_NAME = 'saki-sushi-v1';

// ─────────────────────────────────────────
// INSTALACIÓN Y ACTIVACIÓN
// ─────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activado');
    event.waitUntil(clients.claim());
});

// ─────────────────────────────────────────
// NOTIFICACIONES PUSH (servidor → dispositivo)
// Disparadas por la Edge Function send-push vía VAPID.
// ─────────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Push recibido');

    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { titulo: '🍣 Saki Sushi', mensaje: event.data ? event.data.text() : 'Nueva notificación' };
    }

    const titulo  = data.titulo  || '🍣 Saki Sushi';
    const mensaje = data.mensaje || 'Tienes una nueva notificación';
    const url     = data.url     || '/SakiSushi0/Cliente/';
    const icon    = data.icon    || '/SakiSushi0/icons/icon-192x192.png';
    const badge   = data.badge   || '/SakiSushi0/icons/badge-72x72.png';

    const options = {
        body:    mensaje,
        icon:    icon,
        badge:   badge,
        vibrate: [200, 100, 200],
        tag:     'saki-notif-' + (data.pedido_id || Date.now()),
        renotify: true,
        data: { url, pedido_id: data.pedido_id, tipo: data.tipo },
        actions: [
            { action: 'ver', title: '👁 Ver pedido' },
            { action: 'cerrar', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(titulo, options)
    );
});

// ─────────────────────────────────────────
// NOTIFICACIONES LOCALES (página en segundo plano → SW)
// La página detecta una notificación nueva vía polling y
// le envía un postMessage al SW para que la muestre.
// ─────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'SHOW_LOCAL_NOTIFICATION') {
        const titulo  = event.data.titulo  || '🍣 Saki Sushi';
        const mensaje = event.data.mensaje || 'Tienes una nueva notificación';
        const url     = event.data.url     || '/SakiSushi0/Cliente/';

        const options = {
            body:    mensaje,
            icon:    '/SakiSushi0/icons/icon-192x192.png',
            badge:   '/SakiSushi0/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            tag:     'saki-local-' + Date.now(),
            renotify: true,
            data: { url }
        };

        event.waitUntil(
            self.registration.showNotification(titulo, options)
        );
    }
});

// ─────────────────────────────────────────
// CLIC EN NOTIFICACIÓN
// Abre o enfoca la pestaña del cliente al hacer clic.
// ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'cerrar') return;

    const urlDestino = event.notification.data?.url || '/SakiSushi0/Cliente/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una pestaña abierta con esa URL, la enfocamos
            for (const client of clientList) {
                if (client.url.includes('/Cliente/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no hay ninguna, abrimos una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlDestino);
            }
        })
    );
});
