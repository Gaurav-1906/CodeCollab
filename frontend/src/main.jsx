// Fix missing process.nextTick in browser environments (for simple-peer)
window.process = window.process || { nextTick: (fn) => setTimeout(fn, 0) };

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { NotificationProvider } from './context/NotificationContext';

ReactDOM.createRoot(document.getElementById('root')).render(
 // <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  //</React.StrictMode>
);
