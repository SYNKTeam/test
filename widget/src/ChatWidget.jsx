import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Fab,
  Zoom,
  Collapse,
  Divider,
  InputAdornment
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MinimizeIcon from '@mui/icons-material/Minimize';
import axios from 'axios';

function ChatWidget({ apiUrl, wsUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !hasJoined) return;

    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message' && chatId) {
        if (data.record.chatParentID === chatId) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === data.record.id);
            if (exists) return prev;
            return [...prev, data.record];
          });
        }
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isOpen, hasJoined, chatId, wsUrl]);

  const handleJoin = async () => {
    if (!username.trim()) return;

    try {
      const userResponse = await axios.post(`${apiUrl}/users`, {
        username: username,
        role: 'customer'
      });
      setUserId(userResponse.data.id);

      const chatResponse = await axios.post(`${apiUrl}/chats`, {
        author: username,
        assignedStaff: ''
      });
      setChatId(chatResponse.data.id);

      setHasJoined(true);
    } catch (error) {
      console.error('Failed to join chat:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      const response = await axios.post(`${apiUrl}/messages`, {
        message: newMessage,
        author: userId,
        chatParentID: chatId
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasJoined) {
        handleSend();
      } else {
        handleJoin();
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999
      }}
    >
      <Zoom in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            width: 380,
            height: 600,
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 12px 48px rgba(0,0,0,0.3)'
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <SupportAgentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Live Support
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  We're here to help
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ color: 'white' }}
            >
              <MinimizeIcon />
            </IconButton>
          </Box>

          {!hasJoined ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                gap: 3
              }}
            >
              <ChatIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5 }} />
              <Typography variant="h6" textAlign="center">
                Welcome to Live Chat
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Enter your name to start chatting with our support team
              </Typography>
              <TextField
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Your name"
                variant="outlined"
                autoFocus
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleJoin}
                        disabled={!username.trim()}
                        edge="end"
                        color="primary"
                      >
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  backgroundColor: '#f8f9fa'
                }}
              >
                {messages.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      gap: 2
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message) => {
                    const isStaff = message.author === 'staff';

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isStaff ? 'flex-start' : 'flex-end',
                          mb: 2
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: isStaff ? 'row' : 'row-reverse',
                            alignItems: 'flex-end',
                            maxWidth: '75%'
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              mx: 0.5,
                              bgcolor: isStaff ? 'primary.main' : 'secondary.main'
                            }}
                          >
                            {isStaff ? <SupportAgentIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          </Avatar>

                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              backgroundColor: isStaff ? 'white' : 'primary.main',
                              color: isStaff ? 'text.primary' : 'white',
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            <Typography variant="body2">{message.message}</Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: 0.7,
                                fontSize: '0.7rem'
                              }}
                            >
                              {new Date(message.created).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Paper>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Divider />

              <Box sx={{ p: 2, backgroundColor: 'white' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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
                          edge="end"
                          color="primary"
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </>
          )}
        </Paper>
      </Zoom>

      <Fab
        color="primary"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)'
          }
        }}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </Fab>
    </Box>
  );
}

export default ChatWidget;
