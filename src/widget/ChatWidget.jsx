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
              return prev.map(m => m.id === data.record.id ? data.record : m);
            }
            return [...prev, data.record];
          });

          if (data.record.author === 'staff' && !data.record.read) {
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
        author: userId,
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
                background: '#00bfa5',
                color: 'white',
                padding: '20px',
              }}
            >
              <Group justify="space-between">
                <Group>
                  <Avatar size={40} color="rgba(255,255,255,0.25)">
                    <IconHeadset size={24} />
                  </Avatar>
                  <div>
                    <Text fw={600} size="lg" c="white">
                      Chat with us
                    </Text>
                    <Text size="xs" c="white" opacity={0.95}>
                      We typically reply instantly
                    </Text>
                  </div>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="white"
                  onClick={() => setIsOpen(false)}
                  size="lg"
                >
                  <IconMinus size={20} />
                </ActionIcon>
              </Group>
            </Box>

            {!hasJoined ? (
              <Stack
                align="center"
                justify="center"
                gap="lg"
                style={{ flex: 1, padding: '2rem' }}
              >
                <Avatar size={64} color="teal" radius="xl">
                  <IconMessage size={32} />
                </Avatar>
                <Text fw={600} size="lg" ta="center">
                  Start a conversation
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  We usually respond within a few minutes
                </Text>
                <TextInput
                  w="100%"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name"
                  rightSection={
                    <ActionIcon
                      onClick={handleJoin}
                      disabled={!username.trim()}
                      color="teal"
                      variant="subtle"
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

                      return (
                        <Box
                          key={message.id}
                          style={{
                            display: 'flex',
                            justifyContent: isStaff ? 'flex-start' : 'flex-end',
                            marginBottom: '1rem'
                          }}
                        >
                          <Group
                            align="flex-end"
                            style={{
                              flexDirection: isStaff ? 'row' : 'row-reverse',
                              maxWidth: '75%'
                            }}
                          >
                            <Avatar
                              size={32}
                              color={isStaff ? 'teal' : 'gray'}
                              style={{ margin: '0 0.5rem' }}
                            >
                              {isStaff ? <IconHeadset size={18} /> : <IconUser size={18} />}
                            </Avatar>

                            <div>
                              <Paper
                                p="sm"
                                style={{
                                  backgroundColor: isStaff ? '#f1f5f9' : '#00bfa5',
                                  color: isStaff ? '#1e293b' : 'white',
                                  borderRadius: '12px',
                                  borderTopLeftRadius: isStaff ? '4px' : '12px',
                                  borderTopRightRadius: isStaff ? '12px' : '4px',
                                  wordBreak: 'break-word',
                                  border: isStaff ? '1px solid #e2e8f0' : 'none'
                                }}
                              >
                                <Text size="sm" style={{ lineHeight: 1.5 }}>
                                  {message.message}
                                </Text>
                              </Paper>
                              <Group
                                gap={4}
                                justify={isStaff ? 'flex-start' : 'flex-end'}
                                style={{
                                  marginTop: 4,
                                  marginLeft: isStaff ? 8 : 0,
                                  marginRight: isStaff ? 0 : 8
                                }}
                              >
                                <Text size="xs" c="dimmed">
                                  {new Date(message.created).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                                {!isStaff && (
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
                    })
                  )}

                  {/* Typing indicator */}
                  {hasJoined && (
                    <Transition mounted={isTyping} transition="fade" duration={200}>
                      {(styles) => (
                        <Box style={{ ...styles, display: 'flex', marginBottom: '1rem' }}>
                          <Group align="flex-end">
                            <Avatar size={32} color="teal" style={{ margin: '0 0.5rem' }}>
                              <IconHeadset size={18} />
                            </Avatar>
                            <Paper
                              p="sm"
                              style={{
                                backgroundColor: '#f1f5f9',
                                borderRadius: '12px',
                                borderTopLeftRadius: '4px',
                                border: '1px solid #e2e8f0',
                                minWidth: '60px'
                              }}
                            >
                              <Text size="sm" c="dimmed">
                                ...
                              </Text>
                            </Paper>
                          </Group>
                        </Box>
                      )}
                    </Transition>
                  )}

                  <div ref={messagesEndRef} />
                </Box>

                <Divider />

                <Box p="md" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <Textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Write a message..."
                    minRows={1}
                    maxRows={3}
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
                  />
                </Box>
              </>
            )}
          </Paper>
        )}
      </Transition>

      <ActionIcon
        onClick={() => setIsOpen(!isOpen)}
        size={60}
        radius="xl"
        style={{
          backgroundColor: '#00bfa5',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,191,165,0.4)',
          transition: 'all 0.2s',
        }}
        styles={{
          root: {
            '&:hover': {
              backgroundColor: '#008e76',
              boxShadow: '0 6px 16px rgba(0,191,165,0.5)',
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
