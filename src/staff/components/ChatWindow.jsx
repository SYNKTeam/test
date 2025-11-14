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
            return prev.map(m => m.id === data.record.id ? data.record : m);
          }
          return [...prev, data.record];
        });

        if (data.record.author !== 'staff' && !data.record.read) {
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
        p="lg"
        style={{
          borderRadius: 0,
          borderBottom: '1px solid #e9ecef',
          backgroundColor: 'white'
        }}
      >
        <Group>
          <Avatar size={48} color="gray">
            {chat.author?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <div>
            <Text fw={600} size="md">
              {chat.author || 'Anonymous User'}
            </Text>
            <Text size="sm" c="dimmed">
              Active now
            </Text>
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
              <Box key={message.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Group gap="sm">
                  <Avatar size={24} color="violet" variant="filled">
                    <IconRobot size={14} />
                  </Avatar>
                  <Paper
                    p="xs"
                    px="md"
                    style={{
                      backgroundColor: '#f3e5f5',
                      color: '#6a1b9a',
                      borderRadius: '16px',
                      border: '1px solid #ce93d8',
                      boxShadow: '0 2px 8px rgba(106, 27, 154, 0.1)'
                    }}
                    shadow="none"
                  >
                    <Text size="xs" style={{ lineHeight: 1.6, fontWeight: 500 }}>
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
                marginBottom: '1rem'
              }}
            >
              <Group
                align="flex-end"
                style={{
                  flexDirection: isStaff ? 'row-reverse' : 'row',
                  maxWidth: '65%'
                }}
              >
                {showAvatar ? (
                  <Avatar
                    size={32}
                    color={isStaff ? 'teal' : 'gray'}
                    style={{ margin: '0 0.5rem' }}
                  >
                    {isStaff ? <IconHeadset size={16} /> : <IconUser size={16} />}
                  </Avatar>
                ) : (
                  <Box style={{ width: 32, margin: '0 0.5rem' }} />
                )}

                <div>
                  <Paper
                    p="sm"
                    style={{
                      backgroundColor: isStaff ? '#00bfa5' : '#f1f5f9',
                      color: isStaff ? 'white' : '#1e293b',
                      borderRadius: '8px',
                      wordBreak: 'break-word',
                      border: isStaff ? 'none' : '1px solid #e2e8f0'
                    }}
                    shadow="none"
                  >
                    <Text size="sm" style={{ lineHeight: 1.5 }}>
                      {message.message}
                    </Text>
                  </Paper>
                  <Group
                    gap={4}
                    justify={isStaff ? 'flex-end' : 'flex-start'}
                    style={{
                      marginTop: 4,
                      marginLeft: isStaff ? 0 : 8,
                      marginRight: isStaff ? 8 : 0
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      {new Date(message.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {isStaff && (
                      message.read ? (
                        <IconChecks size={14} color="#00bfa5" />
                      ) : message.sent ? (
                        <IconCheck size={14} color="#64748b" />
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
            <Box style={{ ...styles, display: 'flex', marginBottom: '1rem' }}>
              <Group align="flex-end">
                <Avatar size={32} color="gray" style={{ margin: '0 0.5rem' }}>
                  <IconUser size={16} />
                </Avatar>
                <Paper
                  p="sm"
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    minWidth: '60px'
                  }}
                  shadow="none"
                >
                  <div className="typing-dots" style={{ color: '#64748b' }}>
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
        p="md"
        style={{
          borderRadius: 0,
          borderTop: '1px solid #e9ecef',
          backgroundColor: 'white'
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
          rightSection={
            <ActionIcon
              onClick={handleSend}
              disabled={!newMessage.trim()}
              color="teal"
              variant="subtle"
              style={{ marginTop: 'auto', marginBottom: 4 }}
            >
              <IconSend size={18} />
            </ActionIcon>
          }
          styles={{
            root: {
              backgroundColor: '#f8fafc'
            }
          }}
        />
      </Paper>
    </Box>
  );
}

export default ChatWindow;
