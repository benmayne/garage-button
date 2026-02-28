// Minimal service worker — required for PWA installability.
// No caching: state must always be fresh from the server.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
