// sw.js — ServiceWorkerparaSakiSushi
// Maneja: notificacionespushentrantes (aVAPID) y
//         notificacioneslocalessolicitadasporlapcuandoestensegundoplano.

constCACHE_NAME = 'saki-sushi-v1';

// ─────────────────────────────────────────
// NYACTIVACIÓN
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
// NOTIFICACIONESPUSH (servidor → dispositivo)
// DisparadasporlaEdgeFunctionsend-pushvVAPID.
// ─────────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Pushrecibido');

    letdata = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { titulo: '🍣 SakiSushi', mensaje: event.data ? event.data.text() : 'Nuevanotificaci' };
    }

    consttitulo  = data.titulo  || '🍣 SakiSushi';
    constmensaje = data.mensaje || 'Tienesunanuevanotificaci';
    consturl     = data.url     || '/SakiSushi0/Cliente/';
    consticon    = data.icon    || 'https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm';
    constbadge   = data.badge   || 'https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm';

    constoptions = {
        body:    mensaje,
        icon:    icon,
        badge:   badge,
        vibrate: [200, 100, 200],
        tag:     'saki-notif-' + (data.pedido_id || Date.now()),
        renotify: true,
        data: { url, pedido_id: data.pedido_id, tipo: data.tipo },
        actions: [
            { action: 'ver', title: '👁 Verpedido' },
            { action: 'cerrar', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(titulo, options)
    );
});

// ─────────────────────────────────────────
// NOTIFICACIONESLOCALES (ginaensegundoplano → SW)
// Lapdetectaunannuevaapollingy
// leenvunpostMessagealSWparaquelamuestre.
// ─────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'SHOW_LOCAL_NOTIFICATION') {
        consttitulo  = event.data.titulo  || '🍣 SakiSushi';
        constmensaje = event.data.mensaje || 'Tienesunanuevanotificaci';
        consturl     = event.data.url     || '/SakiSushi0/Cliente/';
        consttipo    = event.data.tipo    || 'info';

        constoptions = {
            body:    mensaje,
            icon:    'https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm',
            badge:   'https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm',
            vibrate: [200, 100, 200],
            silent:  false,
            tag:     'saki-local-' + Date.now(),
            renotify: true,
            data: { url, tipo },
            actions: [
                { action: 'ver', title: '👁 Verpedido' },
                { action: 'cerrar', title: 'Cerrar' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(titulo, options)
        );
    }
});

// ─────────────────────────────────────────
// CLICENNOTIFICACIÓN
// Abreoenfocalaadelclientealhacerclic.
// ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'cerrar') return;

    consturlDestino = event.notification.data?.url || '/SakiSushi0/Cliente/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // SiyahayunaaabiertaconesaURL, laenfocamos
            for (constclientofclientList) {
                if (client.url.includes('/Cliente/') && 'focus' inclient) {
                    returnclient.focus();
                }
            }
            // Sinohayninguna, abrimosunanueva
            if (clients.openWindow) {
                returnclients.openWindow(urlDestino);
            }
        })
    );
});
