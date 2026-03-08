// sw.js - Service Worker para notificaciones push y caché
const CACHE_NAME = 'saki-sushi-v1';
const urlsToCache = [
    '/SakiSushi0/',
    '/SakiSushi0/Cliente/',
    '/SakiSushi0/supabase-config.js',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    console.log('📦 Service Worker instalando...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('🔧 Cache abierto');
            return cache.addAll(urlsToCache).catch(err => {
                console.warn('⚠️ Error cacheando algunos recursos:', err);
            });
        })
    );
});

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activado');
    event.waitUntil(clients.claim());
    event.waitUntil(
        caches.keys().then(keyList => Promise.all(
            keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('🗑️ Eliminando cache antiguo:', key);
                    return caches.delete(key);
                }
            })
        ))
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('supabase.co') || 
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com')) {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                if (fetchResponse && fetchResponse.status === 200 && 
                    event.request.url.startsWith(self.location.origin)) {
                    const responseClone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return fetchResponse;
            });
        }).catch(() => {
            if (event.request.mode === 'navigate') {
                return caches.match('/SakiSushi0/Cliente/');
            }
        })
    );
});

self.addEventListener('push', event => {
    console.log('📨 Push recibido:', event);
    
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            titulo: '🍣 Saki Sushi',
            mensaje: event.data?.text() || 'Nueva notificación',
            url: '/SakiSushi0/Cliente/',
            sessionId: null,
            pedidoId: null
        };
    }
    
    const opciones = {
        body: data.mensaje || 'Tienes una nueva notificación',
        icon: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-192x192.png',
        badge: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/SakiSushi0/Cliente/',
            sessionId: data.sessionId,
            pedidoId: data.pedidoId,
            timestamp: Date.now()
        },
        tag: `saki-${data.pedidoId || Date.now()}`,
        renotify: true,
        requireInteraction: true,
        actions: [
            { action: 'abrir', title: '🔔 Ver pedido' },
            { action: 'cerrar', title: '✖️ Cerrar' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.titulo || '🍣 Saki Sushi',
            opciones
        )
    );
});

self.addEventListener('notificationclick', event => {
    console.log('👆 Notificación clickeada:', event);
    event.notification.close();
    
    if (event.action === 'cerrar') return;
    
    const urlBase = 'https://lokeraar.github.io';
    const urlDestino = event.notification.data?.url || '/SakiSushi0/Cliente/';
    const sessionId = event.notification.data?.sessionId;
    const pedidoId = event.notification.data?.pedidoId;
    let urlCompleta = urlBase + urlDestino;
    
    if (sessionId) urlCompleta += `?notif=${sessionId}`;
    if (pedidoId) urlCompleta += (sessionId ? '&' : '?') + `pedido=${pedidoId}`;
    
    console.log('🔗 Abriendo:', urlCompleta);
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                for (let client of windowClients) {
                    if (client.url.includes('/SakiSushi0/Cliente/') && 'focus' in client) {
                        return client.navigate(urlCompleta).then(() => client.focus());
                    }
                }
                return clients.openWindow(urlCompleta);
            })
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-notificaciones') {
        console.log('🔄 Sync de notificaciones');
        event.waitUntil(
            clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SYNC_NOTIFICACIONES' });
                });
            })
        );
    }
});

console.log('✅ Service Worker cargado correctamente');
