// sw.js - Service Worker para notificaciones push - VERSIÓN COMPLETA
const CACHE_NAME = 'saki-sushi-v2';
const STATIC_ASSETS = [
  '/SakiSushi0/Cliente/',
  '/SakiSushi0/Cajero/',
  '/SakiSushi0/Admin%202.0.html',
  '/SakiSushi0/supabase-config.js',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado - Saki Sushi v2');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => Promise.resolve()))
  );
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activado');
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
      })
    ))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request).then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return response;
        }))
        .catch(() => new Response('Offline', { status: 503 }))
    );
  }
});

self.addEventListener('push', (event) => {
  console.log('📨 Push recibido:', event);
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      titulo: '🍣 Saki Sushi',
      mensaje: event.data?.text() || 'Nueva notificación',
      tipo: 'info',
      url: '/SakiSushi0/Cliente/'
    };
  }

  const opciones = {
    body: data.mensaje,
    icon: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-192x192.png',
    badge: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/SakiSushi0/Cliente/',
      sessionId: data.session_id,
      pedidoId: data.pedido_id,
      tipo: data.tipo
    },
    tag: `saki-${data.pedido_id || data.session_id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: []
  };

  switch (data.tipo) {
    case 'approved':
      opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-success.png';
      opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-success.png';
      opciones.actions = [
        { action: 'ver', title: '👀 Ver pedido' },
        { action: 'cerrar', title: '❌ Cerrar' }
      ];
      break;
    case 'rejected':
      opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-error.png';
      opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-error.png';
      opciones.actions = [
        { action: 'ver', title: '👀 Ver motivo' },
        { action: 'cerrar', title: '❌ Cerrar' }
      ];
      break;
    case 'pending':
      opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-pending.png';
      opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-pending.png';
      opciones.actions = [
        { action: 'ver', title: '👀 Ver estado' },
        { action: 'cerrar', title: '❌ Cerrar' }
      ];
      break;
    case 'session_closed':
      opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-warning.png';
      opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-warning.png';
      opciones.tag = 'saki-session-closed';
      opciones.actions = [
        { action: 'cerrar_sesion', title: '🔒 Cerrar sesión' },
        { action: 'ignorar', title: '❌ Ignorar' }
      ];
      break;
    default:
      opciones.actions = [
        { action: 'abrir', title: '🔔 Abrir' },
        { action: 'cerrar', title: '❌ Cerrar' }
      ];
  }

  event.waitUntil(self.registration.showNotification(data.titulo || '🍣 Saki Sushi', opciones));
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ 
        type: 'PUSH_RECEIVED', 
        data: {
          ...data,
          timestamp: Date.now()
        }
      })))
  );
});

self.addEventListener('notificationclick', (event) => {
  const notif = event.notification;
  const action = event.action;
  const data = notif.data || {};
  notif.close();

  if (action === 'cerrar' || action === 'ignorar') return;

  if (action === 'cerrar_sesion' || data.tipo === 'session_closed') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => clients.forEach(c => {
          if (c.url.includes('/SakiSushi0/Cajero/')) {
            c.postMessage({ 
              type: 'FORCE_LOGOUT', 
              reason: 'Sesión cerrada desde otro dispositivo',
              timestamp: Date.now()
            });
          }
        }))
    );
    return;
  }

  const urlBase = 'https://lokeraar.github.io';
  const urlDestino = data.url || '/SakiSushi0/Cliente/';
  const params = new URLSearchParams();
  if (data.sessionId) params.append('notif', data.sessionId);
  if (data.pedidoId) params.append('pedido', data.pedidoId);
  const urlCompleta = urlBase + urlDestino + (params.toString() ? '?' + params.toString() : '');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const c of clients) {
          if (c.url.includes('/SakiSushi0/') && 'focus' in c) {
            return c.navigate(urlCompleta).then(() => c.focus());
          }
        }
        return clients.openWindow(urlCompleta);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    event.source.postMessage({ 
      type: 'PONG', 
      timestamp: Date.now(),
      swVersion: 'v2'
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_NOTIFICATIONS') {
    // Puedes implementar lógica para enviar notificaciones almacenadas
    event.source.postMessage({
      type: 'NOTIFICATIONS_STATUS',
      active: true
    });
  }
});

self.addEventListener('error', (e) => console.error('SW Error:', e.error));
self.addEventListener('unhandledrejection', (e) => console.error('SW Rejection:', e.reason));