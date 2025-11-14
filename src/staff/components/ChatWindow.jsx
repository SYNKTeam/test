import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Divider,
  InputAdornment,
  Fade
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axios from 'axios';

const API_URL = '/api';
const isDev = import.meta.env.DEV;
const WS_URL = isDev ? 'ws://localhost:3001' : `ws://${window.location.host}`;

function ChatWindow({ chat, staffName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [chat.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle new/updated messages
      if (data.type === 'message' && data.record.chatParentID === chat.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.record.id);
          if (exists) {
            // Update existing message (e.g., read status changed)
            return prev.map(m => m.id === data.record.id ? data.record : m);
          }
          return [...prev, data.record];
        });

        // Mark customer messages as read
        if (data.record.author !== 'staff' && !data.record.read) {
          markAsRead(data.record.id);
        }
      }

      // Handle typing indicators
      if (data.type === 'typing' && data.chatId === chat.id) {
        if (data.author !== 'staff') {
          setIsTyping(data.isTyping);
        }
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [chat.id]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/${chat.id}`);
      setMessages(response.data);

      // Mark all customer messages as read
      response.data.forEach(message => {
        if (message.author !== 'staff' && !message.read) {
          markAsRead(message.id);
        }
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markAsRead = async (messageId) => {
    // Only mark as read if window is focused
    if (!document.hasFocus()) return;

    try {
      await axios.patch(`${API_URL}/messages/${messageId}/read`);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const sendTypingIndicator = (typing) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        chatId: chat.id,
        author: 'staff',
        isTyping: typing
      }));
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    // Send typing indicator
    if (e.target.value.trim()) {
      sendTypingIndicator(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
      sendTypingIndicator(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
            {chat.author?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {chat.author || 'Anonymous User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active now
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          backgroundColor: '#ffffff'
        }}
      >
        {messages.map((message, index) => {
          const isStaff = message.author === 'staff';
          const showAvatar = index === 0 || messages[index - 1].author !== message.author;

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
                  maxWidth: '65%'
                }}
              >
                {showAvatar ? (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      mx: 1,
                      bgcolor: isStaff ? 'primary.main' : 'secondary.main'
                    }}
                  >
                    {isStaff ?
                      <SupportAgentIcon fontSize="small" /> :
                      <PersonIcon fontSize="small" />
                    }
                  </Avatar>
                ) : (
                  <Box sx={{ width: 32, mx: 1 }} />
                )}

                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      backgroundColor: isStaff ? 'primary.main' : '#f1f5f9',
                      color: isStaff ? 'white' : 'text.primary',
                      borderRadius: 2,
                      wordBreak: 'break-word',
                      border: '1px solid',
                      borderColor: isStaff ? 'primary.main' : '#e2e8f0'
                    }}
                  >
                    <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                      {message.message}
                    </Typography>
                  </Paper>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isStaff ? 'flex-end' : 'flex-start',
                      gap: 0.5,
                      mt: 0.5,
                      ml: isStaff ? 0 : 1,
                      mr: isStaff ? 1 : 0
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary'
                      }}
                    >
                      {new Date(message.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                    {isStaff && (
                      message.read ? (
                        <DoneAllIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                      ) : message.sent ? (
                        <CheckIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      ) : null
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Typing indicator */}
        <Fade in={isTyping}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '65%' }}>
              <Avatar sx={{ width: 32, height: 32, mx: 1, bgcolor: 'secondary.main' }}>
                <PersonIcon fontSize="small" />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  backgroundColor: '#f1f5f9',
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  minWidth: '60px'
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ...
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Fade>

        <div ref={messagesEndRef} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'white'
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  color="primary"
                  sx={{
                    '&:disabled': {
                      opacity: 0.3
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#f8fafc'
            }
          }}
        />
      </Paper>
    </Box>
  );
}

export default ChatWindow;
