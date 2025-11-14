# Live Chat Product

A professional real-time live chat support system built with React, PocketBase, and Material-UI inspired by tawk.to.

## Features

- Real-time messaging with WebSocket support
- Staff dashboard with authentication for managing conversations
- Embeddable chat widget for websites
- Clean, professional tawk.to-inspired design
- Material-UI components with custom styling
- PocketBase backend integration
- Secure API wrapper (credentials never exposed to frontend)

## Project Structure

```
.
├── backend/          # Express API server (PocketBase wrapper)
├── frontend/         # Admin dashboard (React + Material-UI)
└── widget/          # Embeddable chat widget (React + Material-UI)
```

## Setup

### Backend

```bash
cd backend
npm install
npm start
```

Server runs on http://localhost:3001

### Staff Dashboard

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs on http://localhost:3000

Access the staff login at: http://localhost:3000/staff

### Chat Widget

```bash
cd widget
npm install
npm run dev
```

Widget demo runs on http://localhost:3002

## PocketBase Configuration

The backend connects to PocketBase at: http://192.168.0.52:8091

Collections used:
- `chats` - Chat sessions
- `liveChatUsers` - User management
- `liveChatMessages` - Messages

## Usage

1. Start the backend server
2. Start the staff dashboard
3. Start the widget (for testing)
4. Open http://localhost:3000/staff and enter your name to access the dashboard
5. Open the widget demo at http://localhost:3002 and start a chat
6. View and respond to chats in real-time from the staff dashboard

## Design

The interface features a clean, professional design inspired by tawk.to:
- Teal accent color (#00bfa5) instead of gradients
- Minimalist white backgrounds
- Subtle borders and shadows
- Professional typography
- Smooth animations and transitions

## Embedding the Widget

To embed the chat widget on your website:

```html
<div id="livechat-widget"></div>
<script type="module" src="http://localhost:3002/livechat-widget.js"></script>
```
