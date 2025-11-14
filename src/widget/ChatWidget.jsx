import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Textarea,
  ActionIcon,
  Text,
  Avatar,
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
  IconMinus,
  IconCheck,
  IconChecks,
  IconSparkles,
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

  const handleJoin = async () => {
    if (!username.trim()) return;

    try {
      const userResponse = await axios.post(`${apiUrl}/users`, {
        username: username.trim(),
        role: 'customer'
      });
      setUserId(userResponse.data.id);

      const chatResponse = await axios.post(`${apiUrl}/chats`, {
        author: username.trim(),
        userId: userResponse.data.id,
      });
      setChatId(chatResponse.data.id);
      setHasJoined(true);

      const messagesResponse = await axios.get(`${apiUrl}/messages/${chatResponse.data.id}`);
      setMessages(messagesResponse.data);
    } catch (error) {
      console.error('Failed to join chat:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await axios.post(`${apiUrl}/messages`, {
        message: newMessage.trim(),
        author: username,
        chatParentID: chatId
      });

      setNewMessage('');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chatId,
          author: 'customer',
          isTyping: false
        }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    sendTypingIndicator(true);
  };

  const sendTypingIndicator = (isTyping) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    ws.send(JSON.stringify({
      type: 'typing',
      chatId: chatId,
      author: 'customer',
      isTyping: isTyping
    }));

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chatId,
          author: 'customer',
          isTyping: false
        }));
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasJoined) {
        handleJoin();
      } else {
        handleSend();
      }
    }
  };

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 16,
      }}
    >
      <Transition mounted={isOpen} transition="scale" duration={200}>
        {(styles) => (
          <Paper
            style={{
              ...styles,
              width: 380,
              height: 600,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                background: '#ffffff',
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <Text fw={600} size="sm" c="#111827">
                    SYNK Support
                  </Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  c="#6b7280"
                  onClick={() => setIsOpen(false)}
                  size="sm"
                  radius="sm"
                >
                  <IconMinus size={18} />
                </ActionIcon>
              </Group>
            </Box>

            {!hasJoined ? (
              <Stack
                align="center"
                justify="center"
                gap="lg"
                style={{
                  flex: 1,
                  padding: '48px 32px',
                  background: '#fafafa',
                }}
              >
                <Avatar
                  size={64}
                  radius="xl"
                  style={{
                    background: '#111827',
                    color: 'white',
                  }}
                >
                  <IconMessage size={32} />
                </Avatar>
                <Stack gap="xs" align="center">
                  <Text fw={600} size="lg" c="#111827">
                    Start a conversation
                  </Text>
                  <Text size="sm" c="#6b7280" ta="center">
                    We're here to help
                  </Text>
                </Stack>
                <TextInput
                  w="100%"
                  size="md"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Your name"
                  styles={{
                    input: {
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      '&:focus': {
                        borderColor: '#111827',
                      }
                    }
                  }}
                  rightSection={
                    <ActionIcon
                      onClick={handleJoin}
                      disabled={!username.trim()}
                      size="md"
                      style={{
                        background: username.trim() ? '#111827' : '#e5e7eb',
                        color: 'white',
                      }}
                    >
                      <IconSend size={16} />
                    </ActionIcon>
                  }
                />
              </Stack>
            ) : (
              <>
                <Box
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    background: '#fafafa',
                  }}
                >
                  {messages.map((message) => {
                    const isStaff = message.author === 'staff';
                    const isAI = message.author === 'ai';
                    const isCustomer = !isStaff && !isAI;

                    if (isAI) {
                      return (
                        <Box key={message.id} style={{ marginBottom: 16 }}>
                          <Group gap="xs" align="flex-start">
                            <Avatar
                              size={24}
                              radius="xl"
                              style={{
                                background: '#6366f1',
                                color: 'white',
                                flexShrink: 0,
                              }}
                            >
                              <IconSparkles size={14} />
                            </Avatar>
                            <Box style={{ flex: 1 }}>
                              <Paper
                                p="sm"
                                style={{
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  borderTopLeftRadius: 2,
                                }}
                              >
                                <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                                  {message.message}
                                </Text>
                              </Paper>
                              <Text size="xs" c="#9ca3af" mt={4} ml={2}>
                                {new Date(message.created).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>
                            </Box>
                          </Group>
                        </Box>
                      );
                    }

                    if (isStaff) {
                      return (
                        <Box key={message.id} style={{ marginBottom: 16 }}>
                          <Group gap="xs" align="flex-start">
                            <Avatar
                              size={24}
                              radius="xl"
                              style={{
                                background: '#111827',
                                color: 'white',
                                flexShrink: 0,
                              }}
                            >
                              <IconUser size={14} />
                            </Avatar>
                            <Box style={{ flex: 1 }}>
                              <Paper
                                p="sm"
                                style={{
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  borderTopLeftRadius: 2,
                                }}
                              >
                                <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                                  {message.message}
                                </Text>
                              </Paper>
                              <Text size="xs" c="#9ca3af" mt={4} ml={2}>
                                {new Date(message.created).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>
                            </Box>
                          </Group>
                        </Box>
                      );
                    }

                    return (
                      <Box
                        key={message.id}
                        style={{
                          marginBottom: 16,
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Box style={{ maxWidth: '75%' }}>
                          <Paper
                            p="sm"
                            style={{
                              background: '#111827',
                              color: 'white',
                              borderRadius: 8,
                              borderBottomRightRadius: 2,
                            }}
                          >
                            <Text size="sm" style={{ lineHeight: 1.6 }}>
                              {message.message}
                            </Text>
                          </Paper>
                          <Group gap={6} justify="flex-end" mt={4} mr={2}>
                            <Text size="xs" c="#9ca3af">
                              {new Date(message.created).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                            {message.read ? (
                              <IconChecks size={14} color="#10b981" />
                            ) : message.sent ? (
                              <IconCheck size={14} color="#9ca3af" />
                            ) : null}
                          </Group>
                        </Box>
                      </Box>
                    );
                  })}

                  {isTyping && (
                    <Transition mounted={isTyping} transition="fade" duration={200}>
                      {(styles) => (
                        <Box style={{ ...styles, marginBottom: 16 }}>
                          <Group gap="xs" align="flex-start">
                            <Avatar
                              size={24}
                              radius="xl"
                              style={{
                                background: '#111827',
                                color: 'white',
                              }}
                            >
                              <IconUser size={14} />
                            </Avatar>
                            <Paper
                              p="sm"
                              style={{
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                minWidth: 60,
                              }}
                            >
                              <div className="typing-dots" style={{ color: '#9ca3af' }}>
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
                  p="md"
                  style={{
                    background: 'white',
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <Textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    minRows={1}
                    maxRows={3}
                    autosize
                    styles={{
                      input: {
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                        padding: '10px 44px 10px 12px',
                        '&:focus': {
                          borderColor: '#111827',
                        }
                      }
                    }}
                    rightSection={
                      <ActionIcon
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        size="md"
                        style={{
                          background: newMessage.trim() ? '#111827' : '#e5e7eb',
                          color: 'white',
                          marginBottom: 4,
                        }}
                      >
                        <IconSend size={16} />
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
        size={56}
        radius="xl"
        style={{
          background: '#111827',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {isOpen ? <IconX size={24} /> : <IconMessage size={24} />}
      </ActionIcon>
    </Box>
  );
}

export default ChatWidget;
