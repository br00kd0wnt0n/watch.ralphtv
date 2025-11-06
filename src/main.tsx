import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { CONFIG } from './config.ts';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Send relay URL to service worker
      if (registration.active && CONFIG.RELAY_BASE_URL) {
        registration.active.postMessage({
          type: 'SET_RELAY_URL',
          url: CONFIG.RELAY_BASE_URL
        });
        console.log('Relay URL sent to service worker');
      }

      // Also send to service worker when it becomes active
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (navigator.serviceWorker.controller && CONFIG.RELAY_BASE_URL) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_RELAY_URL',
            url: CONFIG.RELAY_BASE_URL
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
