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
  ScrollArea,
} from '@mantine/core';
import {
  IconSend,
  IconUser,
  IconCheck,
  IconChecks,
  IconSparkles,
} from '@tabler/icons-react';
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

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message' && data.record.chatParentID === chat.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.record.id);
          if (exists) {
            return prev.map(m => m.id === data.record.id ? { ...data.record } : m);
          }
          return [...prev, data.record];
        });

        if (data.record.author !== 'staff' && !data.record.read && document.hasFocus()) {
          markAsRead(data.record.id);
        }
      }

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
    if (!document.hasFocus()) return;

    try {
      await axios.patch(`${API_URL}/messages/${messageId}/read`);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API_URL}/messages`, {
        message: newMessage.trim(),
        author: 'staff',
        chatParentID: chat.id
      });

      setNewMessage('');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chat.id,
          author: 'staff',
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
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    ws.send(JSON.stringify({
      type: 'typing',
      chatId: chat.id,
      author: 'staff',
      isTyping: isTyping
    }));

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chat.id,
          author: 'staff',
          isTyping: false
        }));
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        p="md"
        style={{
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
        }}
      >
        <Group gap="sm">
          <Avatar
            size={40}
            radius="xl"
            style={{
              background: '#f3f4f6',
              color: '#6b7280',
              fontWeight: 600,
            }}
          >
            {chat.author?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <div>
            <Text fw={600} size="sm" c="#111827">
              {chat.author || 'Anonymous User'}
            </Text>
            <Group gap={6} align="center">
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
              <Text size="xs" c="#6b7280">
                Active
              </Text>
            </Group>
          </div>
        </Group>
      </Box>

      <ScrollArea
        style={{
          flex: 1,
          background: '#fafafa',
        }}
        p="md"
      >
        {messages.map((message) => {
          const isStaff = message.author === 'staff';
          const isAI = message.author === 'ai';

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
          }

          return (
            <Box key={message.id} style={{ marginBottom: 16 }}>
              <Group gap="xs" align="flex-start">
                <Avatar
                  size={24}
                  radius="xl"
                  style={{
                    background: '#f3f4f6',
                    color: '#6b7280',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {chat.author?.[0]?.toUpperCase() || 'A'}
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
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    {chat.author?.[0]?.toUpperCase() || 'A'}
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
      </ScrollArea>

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
    </Box>
  );
}

export default ChatWindow;
