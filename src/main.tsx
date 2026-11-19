import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: only where a service worker file is actually served (hosted build), never fatal
if ('serviceWorker' in navigator && location.protocol === 'https:' && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
