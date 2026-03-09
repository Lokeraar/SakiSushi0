// sw.js - Service Worker para notificaciones push - VERSIÓN CON SESIONES
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

// ============================================
// INSTALACIÓN - Cachear assets estáticos
// ============================================
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado - Saki Sushi v2 (con sesiones)');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔧 Cacheando assets estáticos...');
        return cache.addAll(STATIC_ASSETS).catch(error => {
          console.error('❌ Error cacheando assets:', error);
          return Promise.resolve();
        });
      })
  );
});

// ============================================
// ACTIVACIÓN - Limpiar caches antiguos
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activado - Saki Sushi v2');
  event.waitUntil(clients.claim());
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ============================================
// MANEJO DE FETCH - Estrategia cache-first
// ============================================
self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache))
                .catch(err => console.error('Error cacheando:', err));
              
              return response;
            })
            .catch(error => {
              console.error('Fetch falló:', error);
              return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
  }
});

// ============================================
// RECIBIR NOTIFICACIONES PUSH
// ============================================
self.addEventListener('push', (event) => {
  console.log('📨 Push recibido en Service Worker:', event);
  
  let data = {};
  
  try {
    data = event.data.json();
    console.log('📦 Datos de push:', data);
  } catch (e) {
    console.warn('⚠️ Push con datos no JSON, usando texto plano');
    data = {
      titulo: '🍣 Saki Sushi',
      mensaje: event.data?.text() || 'Tienes una nueva notificación',
      tipo: 'info',
      url: '/SakiSushi0/Cliente/',
      sessionId: null,
      pedidoId: null
    };
  }
  
  // Configurar opciones de la notificación según el tipo
  const opciones = {
    body: data.mensaje || 'Tienes una nueva notificación',
    icon: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-192x192.png',
    badge: 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/SakiSushi0/Cliente/',
      sessionId: data.sessionId,
      pedidoId: data.pedidoId,
      tipo: data.tipo,
      timestamp: Date.now()
    },
    tag: `saki-${data.pedidoId || data.sessionId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  // Personalizar según tipo de notificación
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
        { action: 'ver', title: '👀 Ver detalles' },
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
        { action: 'cerrar_sesion', title: '🔒 Cerrar sesión ahora' },
        { action: 'cerrar', title: '❌ Ignorar' }
      ];
      opciones.requireInteraction = true;
      break;
      
    default:
      opciones.actions = [
        { action: 'abrir', title: '🔔 Ver' },
        { action: 'cerrar', title: '❌ Cerrar' }
      ];
  }
  
  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(
      data.titulo || '🍣 Saki Sushi',
      opciones
    )
  );
  
  // Enviar mensaje a todas las pestañas abiertas
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        clientList.forEach(client => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            data: data
          });
        });
      })
  );
});

// ============================================
// CLICK EN NOTIFICACIÓN
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notificación clickeada:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  // Manejar acciones específicas
  if (action === 'cerrar') {
    return; // Solo cerrar la notificación
  }
  
  if (action === 'cerrar_sesion' || (data.tipo === 'session_closed' && action !== 'ignorar')) {
    // Para notificaciones de cierre de sesión, enviar mensaje a la página
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          clientList.forEach(client => {
            if (client.url.includes('/SakiSushi0/Cajero/')) {
              client.postMessage({
                type: 'FORCE_LOGOUT',
                reason: 'Sesión cerrada desde otro dispositivo'
              });
            }
          });
        })
    );
    return;
  }
  
  // Obtener URL de destino para otras notificaciones
  const urlBase = 'https://lokeraar.github.io';
  const urlDestino = data.url || '/SakiSushi0/Cliente/';
  const sessionId = data.sessionId;
  const pedidoId = data.pedidoId;
  
  let urlCompleta = urlBase + urlDestino;
  const params = new URLSearchParams();
  
  if (sessionId) params.append('notif', sessionId);
  if (pedidoId) params.append('pedido', pedidoId);
  
  if (params.toString()) {
    urlCompleta += (urlDestino.includes('?') ? '&' : '?') + params.toString();
  }
  
  console.log('🔗 Abriendo:', urlCompleta);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes('/SakiSushi0/') && 'focus' in client) {
            return client.navigate(urlCompleta)
              .then(() => client.focus());
          }
        }
        return clients.openWindow(urlCompleta);
      })
  );
});

// ============================================
// MENSAJES DESDE LA PÁGINA
// ============================================
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje recibido en SW:', event.data);
  
  if (event.data && event.data.type === 'PING') {
    event.source.postMessage({
      type: 'PONG',
      timestamp: Date.now()
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'LOGOUT_CONFIRMED') {
    console.log('🔒 Usuario confirmó cierre de sesión');
    // Podríamos limpiar caché específico aquí si es necesario
  }
});

// ============================================
// ERRORES - Registrar para debugging
// ============================================
self.addEventListener('error', (event) => {
  console.error('❌ Error en Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promesa no manejada en Service Worker:', event.reason);
});
