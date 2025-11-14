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

// Call TogetherAI API
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
      throw new Error(`TogetherAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling TogetherAI:', error);
    return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or I can connect you with a human agent.";
  }
};

// Detect if user is requesting human agent
const detectsEscalation = (message) => {
  const escalationPatterns = [
    /\b(talk|speak|connect|transfer|get|need)\s+(to|me\s+to|with|a)\s+(human|agent|person|representative|support|staff|someone)\b/i,
    /\b(human|real\s+person|agent|representative)\s+(please|help|support)\b/i,
    /\bcan\s+i\s+(talk|speak)\s+to\s+(someone|agent|person|human)\b/i,
    /\bi\s+(want|need)\s+to\s+(talk|speak)\s+(to|with)\s+(someone|agent|person|human)\b/i,
    /\bescalate\b/i,
    /\blive\s+agent\b/i,
    /\breal\s+support\b/i
  ];

  return escalationPatterns.some(pattern => pattern.test(message));
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

    // Assign chat to AI initially, not visible to staff until escalation
    const chat = await pb.collection('chats').create({
      ...req.body,
      assignedStaff: 'ai',
      needsHuman: false
    });
    console.log('Chat created:', chat.id);

    // Send welcome message immediately
    await authenticatePB();
    const welcomeMessage = await pb.collection('liveChatMessages').create({
      message: `Hi ${req.body.author}! 👋 Welcome to SYNK Hosting support. I'm your AI assistant. How can I help you today?`,
      author: 'ai',
      chatParentID: chat.id,
      sent: true,
      read: false
    });
    console.log('Welcome message sent:', welcomeMessage.id);

    res.json(chat);
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    await authenticatePB();
    // Only show chats that need human assistance
    const chats = await pb.collection('chats').getFullList({
      filter: 'needsHuman = true',
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

    // Get chat to check if it needs human or is AI-handled
    const chat = await pb.collection('chats').getOne(req.body.chatParentID);

    // Only process AI response if message is from customer (not staff/ai) and chat hasn't been escalated
    if (req.body.author !== 'staff' && req.body.author !== 'ai' && !chat.needsHuman) {
      // Check if user is requesting human agent
      const wantsHuman = detectsEscalation(req.body.message);

      if (wantsHuman) {
        console.log('Escalation detected in message:', req.body.message);

        // Mark chat as needing human
        await authenticatePB();
        await pb.collection('chats').update(req.body.chatParentID, {
          needsHuman: true
        });

        // Send escalation confirmation
        await authenticatePB();
        await pb.collection('liveChatMessages').create({
          message: "I understand you'd like to speak with a human agent. I'm connecting you now. A member of our support team will be with you shortly.",
          author: 'ai',
          chatParentID: req.body.chatParentID,
          sent: true,
          read: false
        });
      } else {
        // Get chat history for AI context
        await authenticatePB();
        const messages = await pb.collection('liveChatMessages').getFullList({
          filter: `chatParentID = "${req.body.chatParentID}"`,
          sort: 'created',
        });

        // Build chat history for AI (exclude system welcome messages)
        const chatHistory = messages
          .filter(m => m.author !== 'ai' || !m.message.includes('Welcome to'))
          .map(m => ({
            role: m.author === 'ai' ? 'assistant' : 'user',
            content: m.message
          }));

        // Get AI response
        console.log('Getting AI response for chat:', req.body.chatParentID);
        const aiResponse = await getAIResponse(chatHistory);

        // Send AI response
        await authenticatePB();
        await pb.collection('liveChatMessages').create({
          message: aiResponse,
          author: 'ai',
          chatParentID: req.body.chatParentID,
          sent: true,
          read: false
        });
      }
    }

    res.json(message);
  } catch (error) {
    console.error('Message creation error:', error);
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
    console.log(`Assigning ${staffName} to chat ${req.params.id}`);

    const chat = await pb.collection('chats').update(req.params.id, {
      assignedStaff: staffName
    });
    console.log('Chat updated with assignment:', chat.assignedStaff);

    // Send AI notification message
    await authenticatePB();
    const notification = await pb.collection('liveChatMessages').create({
      message: `${staffName} has joined the chat and will assist you.`,
      author: 'ai',
      chatParentID: req.params.id,
      sent: true,
      read: false
    });
    console.log('Assignment notification sent:', notification.id);

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
