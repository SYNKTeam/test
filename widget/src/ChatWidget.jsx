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
              background: '#00bfa5',
              color: 'white',
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 40, height: 40 }}>
                <SupportAgentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Chat with us
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.95, fontSize: '0.8rem' }}>
                  We typically reply instantly
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
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
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#00bfa5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1
                }}
              >
                <ChatIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h6" textAlign="center" sx={{ fontWeight: 600, mb: 1 }}>
                Start a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                We usually respond within a few minutes
              </Typography>
              <TextField
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your name"
                variant="outlined"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#00bfa5',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00bfa5',
                    }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleJoin}
                        disabled={!username.trim()}
                        edge="end"
                        sx={{
                          color: '#00bfa5',
                          '&:disabled': { opacity: 0.3 }
                        }}
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
                  backgroundColor: '#ffffff'
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
                              width: 32,
                              height: 32,
                              mx: 1,
                              bgcolor: isStaff ? '#00bfa5' : '#64748b'
                            }}
                          >
                            {isStaff ? <SupportAgentIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          </Avatar>

                          <Box>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1.5,
                                backgroundColor: isStaff ? '#f1f5f9' : '#00bfa5',
                                color: isStaff ? '#1e293b' : 'white',
                                borderRadius: '12px',
                                borderTopLeftRadius: isStaff ? '4px' : '12px',
                                borderTopRightRadius: isStaff ? '12px' : '4px',
                                wordBreak: 'break-word',
                                border: isStaff ? '1px solid #e2e8f0' : 'none'
                              }}
                            >
                              <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {message.message}
                              </Typography>
                            </Paper>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                ml: isStaff ? 0.5 : 0,
                                mr: isStaff ? 0 : 0.5,
                                textAlign: isStaff ? 'left' : 'right',
                                color: '#64748b',
                                fontSize: '0.7rem'
                              }}
                            >
                              {new Date(message.created).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Divider />

              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Write a message..."
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'white',
                      '&:hover fieldset': {
                        borderColor: '#00bfa5',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00bfa5',
                      }
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleSend}
                          disabled={!newMessage.trim()}
                          edge="end"
                          sx={{
                            color: '#00bfa5',
                            '&:disabled': { opacity: 0.3 }
                          }}
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
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          width: 60,
          height: 60,
          backgroundColor: '#00bfa5',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,191,165,0.4)',
          '&:hover': {
            backgroundColor: '#008e76',
            boxShadow: '0 6px 16px rgba(0,191,165,0.5)'
          }
        }}
      >
        {isOpen ? <CloseIcon sx={{ fontSize: 28 }} /> : <ChatIcon sx={{ fontSize: 28 }} />}
      </Fab>
    </Box>
  );
}

export default ChatWidget;
