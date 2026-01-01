// Minimal Service Worker to satisfy PWA installability requirements
self.addEventListener('fetch', (event) => {
    // No offline caching as per requirements.
    // This allows requests to go to the network as usual.
    return;
});
