import { useState, useEffect } from 'react';
import {
  AppShell,
  Box,
  Paper,
  Text,
  Avatar,
  Badge,
  ActionIcon,
  Group,
  Stack,
  ScrollArea,
  UnstyledButton,
  Indicator,
  Title,
  Divider
} from '@mantine/core';
import {
  IconMessage,
  IconLogout,
  IconUser,
  IconClock
} from '@tabler/icons-react';
import ChatWindow from '../components/ChatWindow';
import axios from 'axios';

const API_URL = '/api';
const isDev = import.meta.env.DEV;
const WS_URL = isDev ? 'ws://localhost:3001' : `ws://${window.location.host}`;

function StaffDashboard({ staffUser, onLogout }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [ws, setWs] = useState(null);
  const staffName = staffUser?.name || staffUser?.email || 'Staff';

  useEffect(() => {
    loadChats();
    const websocket = new WebSocket(WS_URL);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat') {
        loadChats();
      }

      if (data.type === 'message') {
        setSelectedChat(prev => {
          if (prev && data.record.chatParentID === prev.id) {
            return { ...prev, needsRefresh: true };
          }
          return prev;
        });
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const handleSelectChat = async (chat) => {
    // Auto-assign staff if not already assigned
    if (!chat.assignedStaff || chat.assignedStaff === '') {
      try {
        console.log('Auto-assigning staff to chat:', chat.id);
        const response = await axios.post(`${API_URL}/chats/${chat.id}/assign`, {
          staffName: staffName
        });
        console.log('Assignment response:', response.data);

        // Update the chat locally with the assignment
        const updatedChat = { ...chat, assignedStaff: staffName };
        setSelectedChat(updatedChat);

        // Update the chats list
        setChats(prevChats =>
          prevChats.map(c => c.id === chat.id ? updatedChat : c)
        );
      } catch (error) {
        console.error('Failed to assign staff:', error);
        setSelectedChat(chat);
      }
    } else {
      setSelectedChat(chat);
    }
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 340, breakpoint: 'sm' }}
      padding={0}
    >
      <AppShell.Header>
        <Box
          style={{
            height: '100%',
            padding: '0 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
          }}
        >
          <Group gap="lg">
            <Avatar
              size={48}
              radius="xl"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <IconMessage size={26} />
            </Avatar>
            <div>
              <Title order={2} c="white" style={{ margin: 0, fontWeight: 700 }}>
                Support Dashboard
              </Title>
              <Text size="sm" c="white" opacity={0.9} fw={500}>
                Real-time customer conversations
              </Text>
            </div>
          </Group>
          <Group gap="md">
            <Badge
              leftSection={
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                  }}
                />
              }
              size="lg"
              variant="light"
              color="white"
              radius="md"
              style={{
                color: 'white',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {staffName}
            </Badge>
            <ActionIcon
              onClick={onLogout}
              variant="light"
              c="white"
              size="lg"
              radius="md"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.25)',
                }
              }}
            >
              <IconLogout size={20} />
            </ActionIcon>
          </Group>
        </Box>
      </AppShell.Header>

      <AppShell.Navbar>
        <Box
          p="lg"
          style={{
            borderBottom: '1px solid #f1f5f9',
            background: '#fafbfc',
          }}
        >
          <Group justify="space-between" mb="sm">
            <Text size="lg" fw={700} c="#1e293b">
              Conversations
            </Text>
            <Badge
              size="lg"
              variant="gradient"
              gradient={{ from: '#667eea', to: '#764ba2', deg: 135 }}
              radius="xl"
              style={{
                padding: '6px 14px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
              }}
            >
              {chats.length}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" fw={500}>
            Active customer chats
          </Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="xs">
          <Stack gap="xs">
            {chats.length === 0 ? (
              <Stack align="center" gap="md" py="xl" px="md">
                <Avatar
                  size={60}
                  radius="xl"
                  style={{
                    background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                    color: '#64748b',
                  }}
                >
                  <IconMessage size={30} />
                </Avatar>
                <Stack gap={4} align="center">
                  <Text size="sm" fw={600} c="#64748b" ta="center">
                    No active chats
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    Waiting for customers...
                  </Text>
                </Stack>
              </Stack>
            ) : (
              chats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                const isAssignedToMe = chat.assignedStaff === staffName;
                const isUnassigned = !chat.assignedStaff || chat.assignedStaff === '';

                return (
                  <UnstyledButton
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    style={{
                      padding: '1rem',
                      borderRadius: '14px',
                      background: isSelected
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'white',
                      color: isSelected ? 'white' : 'inherit',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: isSelected ? 'none' : '1px solid #f1f5f9',
                      boxShadow: isSelected
                        ? '0 4px 16px rgba(102, 126, 234, 0.3)'
                        : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <Group gap="md" wrap="nowrap">
                      <Indicator
                        inline
                        size={10}
                        color="#4ade80"
                        processing
                        disabled={!isUnassigned}
                        style={{
                          '& .mantine-Indicator-indicator': {
                            boxShadow: '0 0 12px rgba(74, 222, 128, 0.8)',
                          }
                        }}
                      >
                        <Avatar
                          size={48}
                          radius="xl"
                          style={{
                            background: isSelected
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                            color: 'white',
                            border: isSelected ? '2px solid rgba(255, 255, 255, 0.4)' : 'none',
                            boxShadow: isSelected
                              ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                              : '0 2px 8px rgba(100, 116, 139, 0.25)',
                            fontWeight: 700,
                            fontSize: '18px',
                          }}
                        >
                          {chat.author?.[0]?.toUpperCase() || 'A'}
                        </Avatar>
                      </Indicator>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          fw={700}
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isSelected ? 'white' : '#1e293b',
                            marginBottom: 4,
                          }}
                        >
                          {chat.author || 'Anonymous User'}
                        </Text>
                        <Group gap={6} mt={2}>
                          {isUnassigned ? (
                            <Badge
                              size="sm"
                              variant={isSelected ? 'light' : 'filled'}
                              color={isSelected ? 'white' : 'red'}
                              radius="md"
                              style={{
                                background: isSelected ? 'rgba(255, 255, 255, 0.2)' : undefined,
                                color: isSelected ? 'white' : undefined,
                                fontWeight: 600,
                              }}
                            >
                              New
                            </Badge>
                          ) : isAssignedToMe ? (
                            <Badge
                              size="sm"
                              variant={isSelected ? 'light' : 'filled'}
                              gradient={{ from: '#4ade80', to: '#22c55e', deg: 135 }}
                              radius="md"
                              style={{
                                background: isSelected ? 'rgba(255, 255, 255, 0.2)' : undefined,
                                color: isSelected ? 'white' : 'white',
                                fontWeight: 600,
                              }}
                            >
                              Assigned to you
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              variant={isSelected ? 'light' : 'filled'}
                              color={isSelected ? 'white' : 'gray'}
                              radius="md"
                              style={{
                                background: isSelected ? 'rgba(255, 255, 255, 0.2)' : undefined,
                                fontWeight: 600,
                              }}
                            >
                              {chat.assignedStaff}
                            </Badge>
                          )}
                        </Group>
                      </Box>
                      <IconClock
                        size={18}
                        style={{
                          opacity: isSelected ? 0.9 : 0.4,
                          color: isSelected ? 'white' : '#64748b',
                        }}
                      />
                    </Group>
                  </UnstyledButton>
                );
              })
            )}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} staffName={staffName} />
        ) : (
          <Stack
            align="center"
            justify="center"
            gap="xl"
            style={{
              height: '100%',
              background: 'linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%)',
            }}
          >
            <Box style={{ position: 'relative', padding: '2rem' }}>
              <Box
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  opacity: 0.08,
                  filter: 'blur(40px)',
                }}
              />
              <Avatar
                size={140}
                radius="xl"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 12px 32px rgba(102, 126, 234, 0.25)',
                  opacity: 0.9,
                }}
              >
                <IconMessage size={70} />
              </Avatar>
            </Box>
            <Stack gap="xs" align="center">
              <Text size="xl" fw={700} c="#1e293b">
                Select a Conversation
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={320} fw={500}>
                Choose a chat from the sidebar to start helping customers
              </Text>
            </Stack>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default StaffDashboard;
