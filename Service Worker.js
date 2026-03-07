// sw.js - Service Worker para notificaciones push
const CACHE_NAME = 'saki-sushi-v1';

self.addEventListener('install', (event) => {
    console.log('📦 Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activado');
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    console.log('📨 Push recibido:', event);
    
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            titulo: '🍣 Saki Sushi',
            mensaje: event.data?.text() || 'Nueva notificación',
            url: '/SakiSushi0/Cliente/'
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
            timestamp: Date.now()
        },
        tag: `notif-${data.sessionId || Date.now()}`,
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.titulo || '🍣 Saki Sushi',
            opciones
        )
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('👆 Notificación clickeada:', event);
    
    event.notification.close();
    
    const url = event.notification.data?.url || '/SakiSushi0/Cliente/';
    const sessionId = event.notification.data?.sessionId;
    
    // Abrir o enfocar la ventana
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Buscar si ya hay una ventana abierta
                for (let client of windowClients) {
                    if (client.url.includes('/Cliente/') && 'focus' in client) {
                        // Navegar a la URL con la sesión
                        return client.navigate(url + (sessionId ? `?notif=${sessionId}` : ''))
                            .then(() => client.focus());
                    }
                }
                // Si no hay, abrir una nueva
                return clients.openWindow(url + (sessionId ? `?notif=${sessionId}` : ''));
            })
    );
});