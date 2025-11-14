import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import '../index.css';

const isDev = import.meta.env.DEV;
const API_URL = isDev ? 'http://localhost:5173/api' : '/api';
const WS_URL = isDev ? 'ws://localhost:5173/ws' : `ws://${window.location.host}/ws`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatWidget apiUrl={API_URL} wsUrl={WS_URL} />
  </React.StrictMode>
);
