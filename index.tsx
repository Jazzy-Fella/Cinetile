import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
} catch (error) {
  console.error("CRITICAL BOOT ERROR:", error);
  rootElement.innerHTML = `
    <div style="padding: 40px; color: white; background: #050505; height: 100vh; font-family: sans-serif;">
      <h1 style="color: #ef4444;">Application Failed to Load</h1>
      <p>A fatal error occurred during initialization. Check the browser console for details.</p>
      <pre style="background: #111; padding: 20px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.message : 'Unknown Error'}</pre>
    </div>
  `;
}