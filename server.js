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
const TOGETHER_AI_KEY = '19a70f954fd06451f61d5ce14ef3c98303f72a14f4cfebcaf1a0da3723ffa124';

const AI_SYSTEM_MESSAGE = `You are the AI support agent for SYNK Hosting, a modern web hosting provider offering reliable and affordable hosting solutions. Your role is to assist customers with their hosting inquiries, technical issues, and general questions.

## Your Capabilities
- Answer questions about SYNK Hosting services, plans, and features
- Provide technical guidance on common hosting issues (DNS, SSL, FTP, email, etc.)
- Help customers understand their account, billing, and service status
- Troubleshoot basic technical problems with clear, step-by-step instructions
- Direct users to relevant documentation and resources

## Tone & Style
- Be friendly, professional, and efficient
- Use clear, jargon-free language unless the customer demonstrates technical knowledge
- Keep responses concise but thorough
- Show empathy when customers are experiencing issues
- Never make promises about things you cannot verify (specific timelines, custom solutions, etc.)

## Important Guidelines
- If a customer explicitly requests a human agent or if their issue requires account-specific actions, billing changes, server access, or complex technical intervention, inform them that you're connecting them to a human agent
- Do not make up information about services, pricing, or technical capabilities - if unsure, offer to connect them with an agent
- Never ask for or handle sensitive information like passwords, payment details, or personal data
- If an issue appears to be a service outage or critical problem, prioritize escalation

## Response Format
- Greet customers warmly on first contact
- Acknowledge their issue clearly
- Provide actionable solutions when possible
- End with a clear next step or ask if they need additional help

Remember: Your goal is to resolve issues quickly when possible, and seamlessly escalate to human agents when needed.`;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pb = new PocketBase(POCKETBASE_URL);
const clients = new Map();

const authenticatePB = async () => {
  try {
    await pb.collection('_superusers').authWithPassword(
      POCKETBASE_EMAIL,
      POCKETBASE_PASSWORD
    );
    console.log('[PocketBase] Authenticated successfully');
  } catch (error) {
    console.error('[PocketBase] Authentication failed:', error.message);
    throw error;
  }
};

const getAIResponse = async (chatHistory) => {
  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: AI_SYSTEM_MESSAGE },
          ...chatHistory
        ],
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ['<|eot_id|>', '<|eom_id|>']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TogetherAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[TogetherAI] Error:', error.message);
    return "I apologize, but I'm experiencing technical difficulties. Would you like me to connect you with a human agent?";
  }
};

const detectsEscalation = (message) => {
  const patterns = [
    /\b(talk|speak|connect|transfer|get|need)\s+(to|me\s+to|with|a)\s+(human|agent|person|representative|support|staff|someone)\b/i,
    /\b(human|real\s+person|agent|representative)\s+(please|help|support)\b/i,
    /\bcan\s+i\s+(talk|speak)\s+to\s+(someone|agent|person|human)\b/i,
    /\bi\s+(want|need)\s+to\s+(talk|speak)\s+(to|with)\s+(someone|agent|person|human)\b/i,
    /\bescalate\b/i,
    /\blive\s+agent\b/i,
    /\breal\s+support\b/i
  ];
  return patterns.some(pattern => pattern.test(message));
};

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);
  console.log(`[WebSocket] Client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'typing') {
        broadcastToClients({
          type: 'typing',
          chatId: data.chatId,
          author: data.author,
          isTyping: data.isTyping
        });
      }
    } catch (error) {
      console.error('[WebSocket] Message error:', error.message);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Client error:', error.message);
  });
});

const broadcastToClients = (data) => {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
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
    const customerId = `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    res.json({
      id: customerId,
      username: req.body.username,
      role: req.body.role || 'customer'
    });
  } catch (error) {
    console.error('[API] /api/users error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    await authenticatePB();

    const chat = await pb.collection('chats').create({
      ...req.body,
      assignedStaff: 'ai',
      needsHuman: false
    }, { $autoCancel: false });

    console.log(`[API] Chat created: ${chat.id}`);

    setTimeout(async () => {
      try {
        await pb.collection('liveChatMessages').create({
          message: `Hi ${req.body.author}! 👋 Welcome to SYNK Hosting support. I'm your AI assistant. How can I help you today?`,
          author: 'ai',
          chatParentID: chat.id,
          sent: true,
          read: false
        }, { $autoCancel: false });
      } catch (error) {
        console.error('[API] Welcome message error:', error.message);
      }
    }, 150);

    res.json(chat);
  } catch (error) {
    console.error('[API] /api/chats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    await authenticatePB();
    const chats = await pb.collection('chats').getFullList({
      filter: 'needsHuman = true',
      sort: '-created',
    }, { $autoCancel: false });
    res.json(chats);
  } catch (error) {
    console.error('[API] /api/chats GET error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/:id', async (req, res) => {
  try {
    await authenticatePB();
    const chat = await pb.collection('chats').getOne(req.params.id, { $autoCancel: false });
    res.json(chat);
  } catch (error) {
    console.error('[API] /api/chats/:id error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/chats/:id', async (req, res) => {
  try {
    await authenticatePB();
    const chat = await pb.collection('chats').update(req.params.id, req.body, { $autoCancel: false });
    res.json(chat);
  } catch (error) {
    console.error('[API] /api/chats/:id PATCH error:', error.message);
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
    }, { $autoCancel: false });

    const chat = await pb.collection('chats').getOne(req.body.chatParentID, { $autoCancel: false });

    if (req.body.author !== 'staff' && req.body.author !== 'ai' && !chat.needsHuman) {
      const wantsHuman = detectsEscalation(req.body.message);

      if (wantsHuman) {
        console.log(`[Escalation] Detected in chat: ${req.body.chatParentID}`);

        await pb.collection('chats').update(req.body.chatParentID, {
          needsHuman: true
        }, { $autoCancel: false });

        setTimeout(async () => {
          try {
            await pb.collection('liveChatMessages').create({
              message: "I understand you'd like to speak with a human agent. I'm connecting you now. A member of our support team will be with you shortly.",
              author: 'ai',
              chatParentID: req.body.chatParentID,
              sent: true,
              read: false
            }, { $autoCancel: false });
          } catch (error) {
            console.error('[Escalation] Message error:', error.message);
          }
        }, 100);
      } else {
        const messages = await pb.collection('liveChatMessages').getFullList({
          filter: `chatParentID = "${req.body.chatParentID}"`,
          sort: 'created',
          $autoCancel: false
        });

        const chatHistory = messages
          .filter(m => m.author !== 'ai' || !m.message.includes('Welcome to'))
          .map(m => ({
            role: m.author === 'ai' ? 'assistant' : 'user',
            content: m.message
          }));

        console.log(`[AI] Generating response for chat: ${req.body.chatParentID}`);

        const aiResponse = await getAIResponse(chatHistory);

        setTimeout(async () => {
          try {
            await pb.collection('liveChatMessages').create({
              message: aiResponse,
              author: 'ai',
              chatParentID: req.body.chatParentID,
              sent: true,
              read: false
            }, { $autoCancel: false });
          } catch (error) {
            console.error('[AI] Message error:', error.message);
          }
        }, 100);
      }
    }

    res.json(message);
  } catch (error) {
    console.error('[API] /api/messages error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  try {
    await authenticatePB();
    const messages = await pb.collection('liveChatMessages').getFullList({
      filter: `chatParentID = "${req.params.chatId}"`,
      sort: 'created',
    }, { $autoCancel: false });
    res.json(messages);
  } catch (error) {
    console.error('[API] /api/messages/:chatId error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/messages/:id/read', async (req, res) => {
  try {
    await authenticatePB();
    const message = await pb.collection('liveChatMessages').update(req.params.id, {
      read: true
    }, { $autoCancel: false });
    res.json(message);
  } catch (error) {
    console.error('[API] /api/messages/:id/read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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
    console.error('[API] /api/staff/login error:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/chats/:id/assign', async (req, res) => {
  try {
    await authenticatePB();
    const { staffName } = req.body;

    const chat = await pb.collection('chats').update(req.params.id, {
      assignedStaff: staffName
    }, { $autoCancel: false });

    setTimeout(async () => {
      try {
        await pb.collection('liveChatMessages').create({
          message: `${staffName} has joined the chat and will assist you.`,
          author: 'ai',
          chatParentID: req.params.id,
          sent: true,
          read: false
        }, { $autoCancel: false });
      } catch (error) {
        console.error('[Assignment] Message error:', error.message);
      }
    }, 100);

    res.json(chat);
  } catch (error) {
    console.error('[API] /api/chats/:id/assign error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/staff/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'staff', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[WebSocket] Available at ws://localhost:${PORT}/ws`);
});
