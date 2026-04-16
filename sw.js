/**
 * Bus Tracker Chaitén - Service Worker
 * 
 * Permite que la app funcione offline y se instale como PWA
 */

const CACHE_NAME = 'bus-tracker-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/config.js',
    '/js/app.js',
    '/manifest.json',
    // CDN resources se cachean dinámicamente
];

// Instalación: Cachear recursos estáticos
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cacheando recursos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.log('Service Worker: Error cacheando:', err);
            })
    );
    
    // Activar inmediatamente
    self.skipWaiting();
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Service Worker: Eliminando cache antiguo:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    
    // Tomar control inmediatamente
    self.clients.claim();
});

// Fetch: Estrategia Network First para datos, Cache First para estáticos
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Estrategia diferente según el tipo de recurso
    
    // 1. Recursos de Supabase: Network Only (siempre frescos)
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // 2. Leaflet CDN: Cache First
    if (url.hostname.includes('unpkg.com') || url.hostname.includes('leaflet')) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(request).then(response => {
                    // Cachear respuesta exitosa
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }
    
    // 3. Recursos estáticos de la app: Cache First
    event.respondWith(
        caches.match(request).then(cached => {
            // Devolver cache inmediatamente si existe
            if (cached) {
                // Actualizar cache en background
                fetch(request).then(response => {
                    if (response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, response);
                        });
                    }
                }).catch(() => {
                    // Silenciar errores de actualización
                });
                
                return cached;
            }
            
            // Si no está en cache, hacer fetch
            return fetch(request).then(response => {
                // Cachear respuesta exitosa
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            });
        }).catch(() => {
            // Fallback offline para HTML
            if (request.mode === 'navigate') {
                return caches.match('/index.html');
            }
            
            // Para otros recursos, devolver error
            return new Response('Sin conexión', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        })
    );
});

// Mensajes desde la app principal
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Sincronización en background (para cuando vuelva la conexión)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-location') {
        console.log('Service Worker: Sincronizando ubicación pendiente');
        // Aquí podríamos reintentar enviar ubicaciones pendientes
    }
});

// Notificaciones push (opcional para el futuro)
self.addEventListener('push', event => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'Bus Chaitén';
    const options = {
        body: data.body || 'Actualización del bus',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag || 'bus-update',
        requireInteraction: false
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});

// Click en notificación
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});