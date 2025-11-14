# Live Chat Product

A professional real-time live chat support system built with React, PocketBase, and Material-UI inspired by tawk.to.

## Features

- **Single Server Architecture** - Everything in one place
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
├── server.js         # Main server (API + static file serving)
├── package.json      # All dependencies
├── .env              # PocketBase credentials
├── public/           # Built frontend files (auto-generated)
│   ├── index.html    # Widget demo (/)
│   ├── assets/       # Widget assets
│   └── staff/        # Staff panel (/staff)
└── src/              # Source code
    ├── staff/        # Staff dashboard source
    └── widget/       # Widget source
```

## Quick Start

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Start Server

```bash
npm start
```

Server runs on **http://localhost:3000**

## Routes

- `/` - Widget demo page
- `/staff` - Staff dashboard (login required)
- `/api` - Backend API endpoints

## Usage

1. Start the server: `cd backend && npm start`
2. Visit **http://localhost:3000** to see the widget demo
3. Visit **http://localhost:3000/staff** to access the staff panel
4. Enter your name to log in as staff
5. Start a chat from the widget demo
6. Respond to chats in real-time from the staff dashboard

## PocketBase Configuration

The backend connects to PocketBase. Configure in `backend/.env`:

```env
POCKETBASE_URL=http://192.168.0.52:8091
POCKETBASE_EMAIL=your@email.com
POCKETBASE_PASSWORD=yourpassword
PORT=3000
```

Collections used:
- `chats` - Chat sessions
- `liveChatUsers` - User management
- `liveChatMessages` - Messages

## Design

The interface features a clean, professional design inspired by tawk.to:
- Teal accent color (#00bfa5) instead of gradients
- Minimalist white backgrounds
- Subtle borders and shadows
- Professional typography
- Smooth animations and transitions

## Development

To develop with hot reload:

```bash
cd frontend
npm run dev
```

Then in another terminal:

```bash
cd widget
npm run dev
```

This runs the frontends on separate dev servers. For production, always build and use the single backend server.
