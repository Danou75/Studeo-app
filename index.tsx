
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/globals.css';
import App from './App';
import { registerServiceWorker, setupInstallPrompt } from './utils/serviceWorker';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Enregistrer le service worker pour les fonctionnalités PWA
  // registerServiceWorker();
  // setupInstallPrompt();
  
} catch (error: any) {
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">
    <h3>Erreur d'exécution React</h3>
    <p>${error.message}</p>
  </div>`;
}
