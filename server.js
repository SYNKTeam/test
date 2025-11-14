import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventSource } from 'eventsource';

global.EventSource = EventSource;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://192.168.0.52:8091';
const POCKETBASE_EMAIL = process.env.POCKETBASE_EMAIL || 'root@synkradio.co.uk';
const POCKETBASE_PASSWORD = process.env.POCKETBASE_PASSWORD || 'CantGetMeNow#13';

console.log('PocketBase URL:', POCKETBASE_URL);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const pb = new PocketBase(POCKETBASE_URL);

let isAuthenticated = false;

const authenticatePB = async () => {
  if (!isAuthenticated) {
    await pb.collection('_superusers').authWithPassword(
      POCKETBASE_EMAIL,
      POCKETBASE_PASSWORD
    );
    isAuthenticated = true;
  }
};

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Handle typing indicators
      if (data.type === 'typing') {
        broadcastToClients({
          type: 'typing',
          chatId: data.chatId,
          author: data.author,
          isTyping: data.isTyping
        });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
  });
});

const broadcastToClients = (data) => {
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

await authenticatePB();

pb.collection('liveChatMessages').subscribe('*', (e) => {
  broadcastToClients({
    type: 'message',
    action: e.action,
    record: e.record
  });
});

pb.collection('chats').subscribe('*', (e) => {
  broadcastToClients({
    type: 'chat',
    action: e.action,
    record: e.record
  });
});

app.post('/api/users', async (req, res) => {
  try {
    await authenticatePB();
    const user = await pb.collection('liveChatUsers').create(req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    await authenticatePB();
    const user = await pb.collection('liveChatUsers').getOne(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    await authenticatePB();
    const chat = await pb.collection('chats').create(req.body);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    await authenticatePB();
    const chats = await pb.collection('chats').getFullList({
      sort: '-created',
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/:id', async (req, res) => {
  try {
    await authenticatePB();
    const chat = await pb.collection('chats').getOne(req.params.id);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/chats/:id', async (req, res) => {
  try {
    await authenticatePB();
    const chat = await pb.collection('chats').update(req.params.id, req.body);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    await authenticatePB();
    const message = await pb.collection('liveChatMessages').create({
      ...req.body,
      sent: true,
      read: false
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  try {
    await authenticatePB();
    const messages = await pb.collection('liveChatMessages').getFullList({
      filter: `chatParentID = "${req.params.chatId}"`,
      sort: 'created',
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/messages/:id/read', async (req, res) => {
  try {
    await authenticatePB();
    const message = await pb.collection('liveChatMessages').update(req.params.id, {
      read: true
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/staff/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'staff', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running`);
});
