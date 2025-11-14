import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import { CssBaseline } from '@mui/material';

const container = document.getElementById('livechat-widget');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <CssBaseline />
      <ChatWidget apiUrl="http://localhost:3001/api" wsUrl="ws://localhost:3001" />
    </React.StrictMode>
  );
}
