import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function ChatWindow({ chat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [chat.id]);

  useEffect(() => {
    if (chat.needsRefresh) {
      loadMessages();
    }
  }, [chat.needsRefresh]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/${chat.id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API_URL}/messages`, {
        message: newMessage,
        author: 'staff',
        chatParentID: chat.id
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6">{chat.author || 'Anonymous'}</Typography>
        <Typography variant="body2" color="text.secondary">
          Chat ID: {chat.id}
        </Typography>
      </Paper>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: '#f5f5f5'
        }}
      >
        {messages.map((message) => {
          const isStaff = message.author === 'staff';

          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isStaff ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isStaff ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  maxWidth: '70%'
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mx: 1,
                    bgcolor: isStaff ? 'primary.main' : 'secondary.main'
                  }}
                >
                  {isStaff ? <SupportAgentIcon /> : <PersonIcon />}
                </Avatar>

                <Paper
                  sx={{
                    p: 1.5,
                    backgroundColor: isStaff ? 'primary.main' : 'white',
                    color: isStaff ? 'white' : 'text.primary',
                    borderRadius: 2,
                    wordBreak: 'break-word'
                  }}
                >
                  <Typography variant="body1">{message.message}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.8
                    }}
                  >
                    {new Date(message.created).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            variant="outlined"
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}

export default ChatWindow;
