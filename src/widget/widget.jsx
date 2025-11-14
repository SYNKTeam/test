import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import '../index.css';

const container = document.getElementById('livechat-widget');
if (container) {
  const apiUrl = '/api';
  const isDev = import.meta.env.DEV;
  const wsUrl = isDev ? 'ws://localhost:5173/ws' : `ws://${window.location.host}/ws`;

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ChatWidget apiUrl={apiUrl} wsUrl={wsUrl} />
    </React.StrictMode>
  );
}
