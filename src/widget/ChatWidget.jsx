import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Textarea,
  ActionIcon,
  Text,
  Avatar,
  Divider,
  Transition,
  Group,
  Stack,
  TextInput,
} from '@mantine/core';
import {
  IconMessage,
  IconX,
  IconSend,
  IconUser,
  IconHeadset,
  IconMinus,
  IconCheck,
  IconChecks,
  IconRobot,
} from '@tabler/icons-react';
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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
            if (exists) {
              // Update existing message (including read/sent status)
              return prev.map(m => m.id === data.record.id ? { ...data.record } : m);
            }
            return [...prev, data.record];
          });

          if (data.record.author === 'staff' && !data.record.read && document.hasFocus()) {
            markAsRead(data.record.id);
          }
        }
      }

      if (data.type === 'typing' && data.chatId === chatId) {
        if (data.author === 'staff') {
          setIsTyping(data.isTyping);
        }
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isOpen, hasJoined, chatId, wsUrl]);

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      messages.forEach(message => {
        if (message.author === 'staff' && !message.read) {
          markAsRead(message.id);
        }
      });
    }
  }, [messages, isOpen]);

  // Mark messages as read when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen && messages.length > 0) {
        messages.forEach(message => {
          if (message.author === 'staff' && !message.read) {
            markAsRead(message.id);
          }
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [messages, isOpen]);

  const markAsRead = async (messageId) => {
    if (!document.hasFocus()) return;

    try {
      await axios.patch(`${apiUrl}/messages/${messageId}/read`);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const sendTypingIndicator = (typing) => {
    if (ws && ws.readyState === WebSocket.OPEN && chatId) {
      ws.send(JSON.stringify({
        type: 'typing',
        chatId: chatId,
        author: userId,
        isTyping: typing
      }));
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (e.target.value.trim()) {
      sendTypingIndicator(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

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
      await axios.post(`${apiUrl}/messages`, {
        message: newMessage,
        author: username, // Use the customer's name, not the ID
        chatParentID: chatId
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
      if (hasJoined) {
        handleSend();
      } else {
        handleJoin();
      }
    }
  };

  return (
    <Box style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <Transition mounted={isOpen} transition="scale" duration={200}>
        {(styles) => (
          <Paper
            style={{
              ...styles,
              position: 'absolute',
              bottom: 80,
              right: 0,
              width: 380,
              height: 600,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(0,0,0,0.3)'
            }}
          >
            <Box
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Group justify="space-between" align="flex-start">
                <Group align="center" gap="md">
                  <Box
                    style={{
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }
                    }}
                  >
                    <Avatar
                      size={48}
                      radius="xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      <IconHeadset size={24} />
                    </Avatar>
                  </Box>
                  <div>
                    <Text fw={700} size="lg" c="white" style={{ marginBottom: 2 }}>
                      Support Team
                    </Text>
                    <Group gap={6} align="center">
                      <Box
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#4ade80',
                          boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                        }}
                      />
                      <Text size="xs" c="white" opacity={0.9} fw={500}>
                        Online now
                      </Text>
                    </Group>
                  </div>
                </Group>
                <ActionIcon
                  variant="subtle"
                  c="white"
                  onClick={() => setIsOpen(false)}
                  size="lg"
                  radius="md"
                  style={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                    }
                  }}
                >
                  <IconMinus size={20} />
                </ActionIcon>
              </Group>
            </Box>

            {!hasJoined ? (
              <Stack
                align="center"
                justify="center"
                gap="xl"
                style={{
                  flex: 1,
                  padding: '3rem 2rem',
                  background: 'linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)',
                }}
              >
                <Box
                  style={{
                    position: 'relative',
                    padding: '1rem',
                  }}
                >
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      opacity: 0.1,
                      filter: 'blur(20px)',
                    }}
                  />
                  <Avatar
                    size={80}
                    radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                    }}
                  >
                    <IconMessage size={40} />
                  </Avatar>
                </Box>
                <Stack gap="xs" align="center">
                  <Text fw={700} size="xl" ta="center" c="#1e293b">
                    Welcome to Support
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" maw={280}>
                    Get instant help from our team. We typically respond in under a minute.
                  </Text>
                </Stack>
                <TextInput
                  w="100%"
                  size="md"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name to continue"
                  styles={{
                    input: {
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '15px',
                      padding: '12px 16px',
                      transition: 'all 0.2s',
                      '&:focus': {
                        borderColor: '#667eea',
                        boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                      }
                    }
                  }}
                  rightSection={
                    <ActionIcon
                      onClick={handleJoin}
                      disabled={!username.trim()}
                      size="lg"
                      radius="md"
                      style={{
                        background: username.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                        color: 'white',
                        transition: 'all 0.2s',
                        cursor: username.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <IconSend size={18} />
                    </ActionIcon>
                  }
                />
              </Stack>
            ) : (
              <>
                <Box
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '1rem',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {messages.length === 0 ? (
                    <Stack align="center" justify="center" h="100%">
                      <Text size="sm" c="dimmed" ta="center">
                        No messages yet. Start the conversation!
                      </Text>
                    </Stack>
                  ) : (
                    messages.map((message) => {
                      const isStaff = message.author === 'staff';
                      const isAI = message.author === 'ai';

                      // AI messages (centered with robot icon)
                      if (isAI) {
                        return (
                          <Box key={message.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <Group gap="sm">
                              <Avatar
                                size={26}
                                radius="xl"
                                style={{
                                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
                                }}
                              >
                                <IconRobot size={14} />
                              </Avatar>
                              <Paper
                                p="sm"
                                px="md"
                                style={{
                                  backgroundColor: '#faf5ff',
                                  color: '#6b21a8',
                                  borderRadius: '16px',
                                  border: '1px solid #e9d5ff',
                                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)',
                                  maxWidth: '260px',
                                }}
                              >
                                <Text size="sm" style={{ lineHeight: 1.6, fontWeight: 500 }}>
                                  {message.message}
                                </Text>
                              </Paper>
                            </Group>
                          </Box>
                        );
                      }

                      return (
                        <Box
                          key={message.id}
                          style={{
                            display: 'flex',
                            justifyContent: isStaff ? 'flex-start' : 'flex-end',
                            marginBottom: '1.25rem',
                            paddingLeft: isStaff ? 0 : '3rem',
                            paddingRight: isStaff ? '3rem' : 0,
                          }}
                        >
                          <Group
                            align="flex-end"
                            gap="sm"
                            style={{
                              flexDirection: isStaff ? 'row' : 'row-reverse',
                              maxWidth: '100%',
                            }}
                          >
                            <Avatar
                              size={36}
                              radius="xl"
                              style={{
                                background: isStaff
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                boxShadow: isStaff
                                  ? '0 2px 8px rgba(102, 126, 234, 0.25)'
                                  : '0 2px 8px rgba(100, 116, 139, 0.25)',
                                border: '2px solid white',
                              }}
                            >
                              {isStaff ? <IconHeadset size={18} /> : <IconUser size={18} />}
                            </Avatar>

                            <div>
                              <Paper
                                p="md"
                                style={{
                                  backgroundColor: isStaff ? '#ffffff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  background: isStaff ? '#ffffff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: isStaff ? '#1e293b' : 'white',
                                  borderRadius: '16px',
                                  borderTopLeftRadius: isStaff ? '6px' : '16px',
                                  borderTopRightRadius: isStaff ? '16px' : '6px',
                                  wordBreak: 'break-word',
                                  border: isStaff ? '1px solid #e2e8f0' : 'none',
                                  boxShadow: isStaff
                                    ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                                    : '0 4px 12px rgba(102, 126, 234, 0.3)',
                                }}
                              >
                                <Text size="sm" style={{ lineHeight: 1.6 }}>
                                  {message.message}
                                </Text>
                              </Paper>
                              <Group
                                gap={6}
                                justify={isStaff ? 'flex-start' : 'flex-end'}
                                style={{
                                  marginTop: 6,
                                  paddingLeft: isStaff ? 4 : 0,
                                  paddingRight: isStaff ? 0 : 4,
                                }}
                              >
                                <Text size="xs" c="dimmed" fw={500}>
                                  {new Date(message.created).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                                {!isStaff && (
                                  message.read ? (
                                    <IconChecks size={15} color="#667eea" style={{ strokeWidth: 2.5 }} />
                                  ) : message.sent ? (
                                    <IconCheck size={15} color="#94a3b8" style={{ strokeWidth: 2.5 }} />
                                  ) : null
                                )}
                              </Group>
                            </div>
                          </Group>
                        </Box>
                      );
                    })
                  )}

                  {/* Typing indicator */}
                  {hasJoined && (
                    <Transition mounted={isTyping} transition="fade" duration={200}>
                      {(styles) => (
                        <Box style={{ ...styles, display: 'flex', marginBottom: '1.25rem', paddingRight: '3rem' }}>
                          <Group align="flex-end" gap="sm">
                            <Avatar
                              size={36}
                              radius="xl"
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
                                border: '2px solid white',
                              }}
                            >
                              <IconHeadset size={18} />
                            </Avatar>
                            <Paper
                              p="md"
                              style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '16px',
                                borderTopLeftRadius: '6px',
                                border: '1px solid #e2e8f0',
                                minWidth: '70px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                              }}
                            >
                              <div className="typing-dots" style={{ color: '#667eea' }}>
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                            </Paper>
                          </Group>
                        </Box>
                      )}
                    </Transition>
                  )}

                  <div ref={messagesEndRef} />
                </Box>

                <Box
                  p="lg"
                  style={{
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <Textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    minRows={1}
                    maxRows={3}
                    autosize
                    styles={{
                      input: {
                        borderRadius: '14px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: '#fafafa',
                        fontSize: '14px',
                        padding: '12px 50px 12px 16px',
                        transition: 'all 0.2s',
                        '&:focus': {
                          borderColor: '#667eea',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.08)',
                        }
                      }
                    }}
                    rightSection={
                      <ActionIcon
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        size="lg"
                        radius="xl"
                        style={{
                          background: newMessage.trim()
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#e2e8f0',
                          color: 'white',
                          marginTop: 'auto',
                          marginBottom: 4,
                          marginRight: 4,
                          transition: 'all 0.2s',
                          cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                          boxShadow: newMessage.trim() ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                        }}
                      >
                        <IconSend size={18} />
                      </ActionIcon>
                    }
                  />
                </Box>
              </>
            )}
          </Paper>
        )}
      </Transition>

      <ActionIcon
        onClick={() => setIsOpen(!isOpen)}
        size={64}
        radius="xl"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4), 0 2px 8px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '3px solid white',
        }}
        styles={{
          root: {
            '&:hover': {
              transform: 'scale(1.08)',
              boxShadow: '0 12px 32px rgba(102, 126, 234, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            }
          }
        }}
      >
        {isOpen ? <IconX size={28} /> : <IconMessage size={28} />}
      </ActionIcon>
    </Box>
  );
}

export default ChatWidget;
