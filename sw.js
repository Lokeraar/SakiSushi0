// sw.js - Service Worker para notificaciones push - VERSIÓN FINAL
const CACHE_NAME = 'saki-sushi-v1';
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
  console.log('📦 Service Worker instalado - Saki Sushi');
  
  // Forzar activación inmediata
  self.skipWaiting();
  
  // Precargar assets estáticos
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔧 Cacheando assets estáticos...');
        return cache.addAll(STATIC_ASSETS).catch(error => {
          console.error('❌ Error cacheando assets:', error);
          // No fallar la instalación si algunos assets no se pueden cachear
          return Promise.resolve();
        });
      })
  );
});

// ============================================
// ACTIVACIÓN - Limpiar caches antiguos
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activado - Saki Sushi');
  
  // Tomar control inmediato de todas las pestañas
  event.waitUntil(clients.claim());
  
  // Limpiar caches antiguos
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
  // Solo cachear recursos del mismo origen
  if (event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Devolver cache si existe
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si no está en cache, hacer fetch y cachear
          return fetch(event.request)
            .then(response => {
              // Verificar que la respuesta sea válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar la respuesta (solo se puede usar una vez)
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(err => console.error('Error cacheando:', err));
              
              return response;
            })
            .catch(error => {
              console.error('Fetch falló:', error);
              // Podríamos devolver una página offline aquí
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
    // Intentar parsear los datos de la notificación
    data = event.data.json();
    console.log('📦 Datos de push:', data);
  } catch (e) {
    console.warn('⚠️ Push con datos no JSON, usando texto plano');
    data = {
      titulo: '🍣 Saki Sushi',
      mensaje: event.data?.text() || 'Tienes una nueva notificación',
      url: '/SakiSushi0/Cliente/',
      sessionId: null,
      pedidoId: null
    };
  }
  
  // Configurar opciones de la notificación
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
      {
        action: 'abrir',
        title: '🔔 Ver notificación'
      },
      {
        action: 'cerrar',
        title: '❌ Cerrar'
      }
    ],
    silent: false
  };
  
  // Personalizar icono según tipo de notificación
  if (data.tipo === 'approved') {
    opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-success.png';
    opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-success.png';
  } else if (data.tipo === 'rejected') {
    opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-error.png';
    opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-error.png';
  } else if (data.tipo === 'pending') {
    opciones.icon = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/icono-pending.png';
    opciones.badge = 'https://iqwwoihiiyrtypyqzhgy.supabase.co/storage/v1/object/public/imagenes-platillos/badge-pending.png';
  }
  
  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(
      data.titulo || '🍣 Saki Sushi',
      opciones
    )
  );
  
  // Intentar enviar mensaje a todas las pestañas abiertas
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
  
  notification.close();
  
  // Manejar acciones específicas
  if (action === 'cerrar') {
    return; // Solo cerrar la notificación
  }
  
  // Obtener URL de destino
  const urlBase = 'https://lokeraar.github.io';
  const urlDestino = notification.data?.url || '/SakiSushi0/Cliente/';
  const sessionId = notification.data?.sessionId;
  const pedidoId = notification.data?.pedidoId;
  
  // Construir URL con parámetros
  let urlCompleta = urlBase + urlDestino;
  const params = new URLSearchParams();
  
  if (sessionId) {
    params.append('notif', sessionId);
  }
  if (pedidoId) {
    params.append('pedido', pedidoId);
  }
  
  if (params.toString()) {
    urlCompleta += (urlDestino.includes('?') ? '&' : '?') + params.toString();
  }
  
  console.log('🔗 Abriendo:', urlCompleta);
  
  // Buscar una pestaña existente o abrir una nueva
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Buscar una pestaña de la app ya abierta
        for (let client of windowClients) {
          if (client.url.includes('/SakiSushi0/') && 'focus' in client) {
            // Navegar a la URL específica
            return client.navigate(urlCompleta)
              .then(() => client.focus());
          }
        }
        // Si no hay pestaña, abrir una nueva
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
