import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import { CssBaseline } from '@mui/material';

const container = document.getElementById('livechat-widget');
if (container) {
  const apiUrl = '/api';
  const wsUrl = `ws://${window.location.host}`;

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <CssBaseline />
      <ChatWidget apiUrl={apiUrl} wsUrl={wsUrl} />
    </React.StrictMode>
  );
}
