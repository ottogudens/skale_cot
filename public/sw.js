/* Installation lifecycle only. Requests always go to the network: no app or data cache. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
