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
  ScrollArea,
} from '@mantine/core';
import {
  IconSend,
  IconUser,
  IconHeadset,
  IconCheck,
  IconChecks,
  IconRobot,
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
            // Update existing message (including read/sent status)
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
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        shadow="none"
        p="xl"
        style={{
          borderRadius: 0,
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <Group gap="md">
          <Avatar
            size={56}
            radius="xl"
            style={{
              background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '22px',
              boxShadow: '0 4px 12px rgba(100, 116, 139, 0.25)',
              border: '3px solid #f8fafc',
            }}
          >
            {chat.author?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <div>
            <Text fw={700} size="lg" c="#1e293b">
              {chat.author || 'Anonymous User'}
            </Text>
            <Group gap={8} align="center" mt={4}>
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                }}
              />
              <Text size="sm" c="#64748b" fw={500}>
                Active now
              </Text>
            </Group>
          </div>
        </Group>
      </Paper>

      <ScrollArea
        style={{
          flex: 1,
          backgroundColor: '#ffffff'
        }}
        p="md"
      >
        {messages.map((message, index) => {
          const isStaff = message.author === 'staff';
          const isAI = message.author === 'ai';
          const showAvatar = index === 0 || messages[index - 1].author !== message.author;

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
                      maxWidth: '420px',
                    }}
                    shadow="none"
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
                justifyContent: isStaff ? 'flex-end' : 'flex-start',
                marginBottom: '1.25rem',
                paddingLeft: isStaff ? '4rem' : 0,
                paddingRight: isStaff ? 0 : '4rem',
              }}
            >
              <Group
                align="flex-end"
                gap="sm"
                style={{
                  flexDirection: isStaff ? 'row-reverse' : 'row',
                  maxWidth: '100%'
                }}
              >
                {showAvatar ? (
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
                ) : (
                  <Box style={{ width: 36, margin: '0' }} />
                )}

                <div>
                  <Paper
                    p="md"
                    style={{
                      backgroundColor: isStaff ? '#ffffff' : '#ffffff',
                      background: isStaff ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ffffff',
                      color: isStaff ? 'white' : '#1e293b',
                      borderRadius: '16px',
                      borderTopLeftRadius: isStaff ? '16px' : '6px',
                      borderTopRightRadius: isStaff ? '6px' : '16px',
                      wordBreak: 'break-word',
                      border: isStaff ? 'none' : '1px solid #e2e8f0',
                      boxShadow: isStaff
                        ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                    shadow="none"
                  >
                    <Text size="sm" style={{ lineHeight: 1.6 }}>
                      {message.message}
                    </Text>
                  </Paper>
                  <Group
                    gap={6}
                    justify={isStaff ? 'flex-end' : 'flex-start'}
                    style={{
                      marginTop: 6,
                      paddingLeft: isStaff ? 0 : 4,
                      paddingRight: isStaff ? 4 : 0,
                    }}
                  >
                    <Text size="xs" c="dimmed" fw={500}>
                      {new Date(message.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {isStaff && (
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
        })}

        {/* Typing indicator */}
        <Transition mounted={isTyping} transition="fade" duration={200}>
          {(styles) => (
            <Box style={{ ...styles, display: 'flex', marginBottom: '1.25rem', paddingRight: '4rem' }}>
              <Group align="flex-end" gap="sm">
                <Avatar
                  size={36}
                  radius="xl"
                  style={{
                    background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                    boxShadow: '0 2px 8px rgba(100, 116, 139, 0.25)',
                    border: '2px solid white',
                  }}
                >
                  <IconUser size={18} />
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
                  shadow="none"
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

        <div ref={messagesEndRef} />
      </ScrollArea>

      <Paper
        shadow="none"
        p="lg"
        style={{
          borderRadius: 0,
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Textarea
          value={newMessage}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          minRows={1}
          maxRows={4}
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
      </Paper>
    </Box>
  );
}

export default ChatWindow;
