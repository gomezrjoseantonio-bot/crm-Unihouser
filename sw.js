// Service Worker para Unihouser CRM
// Proporciona capacidades offline y mejora el rendimiento

const CACHE_NAME = 'unihouser-crm-v1';
const urlsToCache = [
  '/',
  '/evaluar.html',
  '/evaluaciones.html', 
  '/buscar-activos.html',
  '/evaluacion-masiva.html',
  '/dashboard.html',
  '/configuracion.html',
  '/css/style.css',
  '/js/app.js',
  '/js/evaluar.js',
  '/js/buscar-activos.js',
  '/js/evaluacion-masiva.js',
  '/data/asturias.json',
  '/logo-unihouser.svg',
  '/logo_Unihouser.svg'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devolver del cache si está disponible
        if (response) {
          return response;
        }

        // Clonar la petición
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          // Agregar al cache
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Si falla la red, devolver página offline personalizada para HTML
          if (event.request.destination === 'document') {
            return caches.match('/evaluar.html');
          }
        });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificar al cliente cuando hay una nueva versión disponible
self.addEventListener('updatefound', () => {
  const newWorker = registration.installing;
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      // Nueva versión disponible
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE'
          });
        });
      });
    }
  });
});