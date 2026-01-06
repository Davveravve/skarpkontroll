// Service Worker för Skarp Kontroll PWA - Offline Support
const CACHE_NAME = 'skarp-kontroll-v1';
const STATIC_CACHE_NAME = 'skarp-kontroll-static-v1';

// Filer som alltid ska cachas (App Shell)
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Installera service worker och cacha viktiga filer
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: App shell cached');
        return self.skipWaiting(); // Aktivera direkt
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache app shell', error);
      })
  );
});

// Aktivera service worker och rensa gamla cachers
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and old caches cleaned');
        return self.clients.claim();
      })
  );
});

// Intercept alla network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hantera endast requests till samma origin
  if (url.origin !== location.origin) {
    return;
  }

  // Cache First Strategy för statiska resurser
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response; // Returnera från cache
          }
          
          // Inte i cache, hämta från nätverk och cacha
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
        .catch(() => {
          // Offline och finns inte i cache
          if (request.destination === 'image') {
            return new Response('Offline', { 
              status: 200, 
              statusText: 'Offline fallback' 
            });
          }
        })
    );
    return;
  }

  // Network First Strategy för API-calls och sidor
  if (request.method === 'GET' && 
      (url.pathname.startsWith('/api/') || 
       url.pathname === '/' ||
       url.pathname.includes('.html'))) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacha framgångsrika responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Nätverk nere, försök cache
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              // Fallback för sidor
              if (url.pathname === '/' || url.pathname.includes('.html')) {
                return caches.match('/')
                  .then((cachedResponse) => {
                    return cachedResponse || new Response(
                      '<html><body><h1>Offline</h1><p>Skarp Kontroll är offline. Anslut till internet för att synka data.</p></body></html>',
                      { 
                        headers: { 'Content-Type': 'text/html' }
                      }
                    );
                  });
              }
              
              return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  }
});

// Background Sync - när nätet kommer tillbaka
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync-offline-data') {
    event.waitUntil(
      syncOfflineData()
    );
  }
});

// Synka offline data när nätet kommer tillbaka
async function syncOfflineData() {
  try {
    console.log('📡 Service Worker: Syncing offline data...');
    
    // Skicka meddelande till huvudtråden att börja synka
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA'
      });
    });
    
  } catch (error) {
    console.error('❌ Service Worker: Sync failed', error);
  }
}

// Push notifications (för framtida användning)
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Ny uppdatering tillgänglig',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Öppna appen',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Stäng',
        icon: '/logo192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Skarp Kontroll', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🎯 Service Worker: Loaded successfully');