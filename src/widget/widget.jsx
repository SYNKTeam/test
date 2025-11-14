import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import '../fonts.css';
import '@mantine/core/styles.css';

const container = document.getElementById('livechat-widget');
if (container) {
  const apiUrl = '/api';
  // In dev mode (Vite), connect WebSocket directly to backend port 3001
  // In production, connect to same host as the page
  const isDev = import.meta.env.DEV;
  const wsUrl = isDev ? 'ws://localhost:3001' : `ws://${window.location.host}`;

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <MantineProvider theme={theme}>
        <ChatWidget apiUrl={apiUrl} wsUrl={wsUrl} />
      </MantineProvider>
    </React.StrictMode>
  );
}
