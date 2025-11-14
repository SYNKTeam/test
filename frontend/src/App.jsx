import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Badge,
  Divider,
  AppBar,
  Toolbar
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

function App() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadChats();
    const websocket = new WebSocket(WS_URL);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat') {
        loadChats();
      }

      if (data.type === 'message' && selectedChat) {
        if (data.record.chatParentID === selectedChat.id) {
          setSelectedChat(prev => ({
            ...prev,
            needsRefresh: true
          }));
        }
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <ChatIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Live Chat Admin</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Paper
          sx={{
            width: 320,
            borderRadius: 0,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Active Chats</Typography>
            <Typography variant="body2" color="text.secondary">
              {chats.length} conversation{chats.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <List sx={{ flex: 1, overflow: 'auto' }}>
            {chats.map((chat) => (
              <ListItem key={chat.id} disablePadding>
                <ListItemButton
                  selected={selectedChat?.id === chat.id}
                  onClick={() => setSelectedChat(chat)}
                >
                  <ListItemText
                    primary={chat.author || 'Anonymous'}
                    secondary={
                      chat.assignedStaff
                        ? `Assigned to: ${chat.assignedStaff}`
                        : 'Unassigned'
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <ChatWindow chat={selectedChat} />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary'
              }}
            >
              <Typography variant="h6">Select a chat to start</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default App;
