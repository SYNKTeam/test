import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import PocketBase from 'pocketbase';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import EventSource from 'eventsource';

global.EventSource = EventSource;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POCKETBASE_URL = 'http://192.168.0.52:8091';
const POCKETBASE_EMAIL = 'root@synkradio.co.uk';
const POCKETBASE_PASSWORD = 'CantGetMeNow#13';

console.log('PocketBase URL:', POCKETBASE_URL);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const pb = new PocketBase(POCKETBASE_URL);

const authenticatePB = async () => {
  try {
    // Always authenticate to ensure we have a valid token
    // PocketBase SDK will handle token caching automatically
    await pb.collection('_superusers').authWithPassword(
      POCKETBASE_EMAIL,
      POCKETBASE_PASSWORD
    );
  } catch (error) {
    console.error('PocketBase authentication failed:', error);
    throw error;
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
    // Simply generate a unique ID for the customer
    // We don't need to store customers in PocketBase
    const customerId = `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    res.json({
      id: customerId,
      username: req.body.username,
      role: req.body.role || 'customer'
    });
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
    console.log('Creating chat with data:', req.body);
    const chat = await pb.collection('chats').create(req.body);
    console.log('Chat created:', chat.id);

    // Send welcome message
    await authenticatePB(); // Ensure still authenticated
    await pb.collection('liveChatMessages').create({
      message: `Hi ${req.body.author}! 👋 Welcome to our support chat. How can we help you today?`,
      author: 'system',
      chatParentID: chat.id,
      sent: true,
      read: false
    });
    console.log('Welcome message sent');

    res.json(chat);
  } catch (error) {
    console.error('Chat creation error:', error);
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

// Staff authentication
app.post('/api/staff/login', async (req, res) => {
  try {
    await authenticatePB();
    const { email, password } = req.body;
    const authData = await pb.collection('users').authWithPassword(email, password);
    res.json({
      user: authData.record,
      token: authData.token
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Assign staff to chat
app.post('/api/chats/:id/assign', async (req, res) => {
  try {
    await authenticatePB();
    const { staffName } = req.body;
    const chat = await pb.collection('chats').update(req.params.id, {
      assignedStaff: staffName
    });

    // Send system message
    await authenticatePB(); // Ensure still authenticated
    await pb.collection('liveChatMessages').create({
      message: `${staffName} has been assigned to your chat and will assist you shortly.`,
      author: 'system',
      chatParentID: req.params.id,
      sent: true,
      read: false
    });

    res.json(chat);
  } catch (error) {
    console.error('Chat assignment error:', error);
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
