
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/globals.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global error handler for debugging on mobile
window.onerror = (msg, url, line, col, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red;">
      <h3>Erreur de chargement</h3>
      <p>${msg}</p>
      <small>${url}:${line}</small>
    </div>`;
  }
  return false;
};

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error: any) {
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">
    <h3>Erreur fatale</h3>
    <p>${error.message}</p>
  </div>`;
}
