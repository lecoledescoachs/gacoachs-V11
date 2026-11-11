// Service worker minimal de l'espace coach : il rend l'espace installable comme une appli.
// Aucune mise en cache : les chiffres viennent toujours du réseau, à jour.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
