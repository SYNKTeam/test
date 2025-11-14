import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ChatWindow from '../components/ChatWindow';
import axios from 'axios';

const API_URL = '/api';
const WS_URL = `ws://${window.location.host}`;

function StaffDashboard({ staffName, onLogout }) {
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
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <ChatIcon />
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            Support Dashboard
          </Typography>
          <Chip
            avatar={<Avatar sx={{ bgcolor: 'primary.light' }}><PersonIcon /></Avatar>}
            label={staffName}
            sx={{ mr: 2 }}
          />
          <IconButton onClick={onLogout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Paper
          elevation={0}
          sx={{
            width: 320,
            borderRadius: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafafa'
          }}
        >
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Conversations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chats.length} active chat{chats.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {chats.map((chat) => (
              <ListItem key={chat.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={selectedChat?.id === chat.id}
                  onClick={() => setSelectedChat(chat)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <Avatar sx={{ mr: 2, width: 40, height: 40, bgcolor: 'secondary.main' }}>
                    {chat.author?.[0]?.toUpperCase() || 'A'}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {chat.author || 'Anonymous User'}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {chat.assignedStaff || 'Unassigned'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
          {selectedChat ? (
            <ChatWindow chat={selectedChat} staffName={staffName} />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary'
              }}
            >
              <ChatIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Select a conversation
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Choose a chat from the sidebar to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default StaffDashboard;
