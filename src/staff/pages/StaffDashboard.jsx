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
} from '@mantine/core';
import {
  IconMessage,
  IconLogout,
  IconUser,
  IconSparkles,
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
    // Auto-assign staff if chat is unassigned or assigned to AI
    if (!chat.assignedStaff || chat.assignedStaff === 'ai' || chat.assignedStaff === '') {
      try {
        console.log('Auto-assigning staff to chat:', chat.id);
        const response = await axios.post(`${API_URL}/chats/${chat.id}/assign`, {
          staffName: staffName
        });
        console.log('Assignment response:', response.data);

        const updatedChat = { ...chat, assignedStaff: staffName };
        setSelectedChat(updatedChat);

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
      header={{ height: 64 }}
      navbar={{ width: 320, breakpoint: 'sm' }}
      padding={0}
    >
      <AppShell.Header>
        <Box
          style={{
            height: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            background: 'white',
          }}
        >
          <Group gap="sm">
            <Avatar
              size={36}
              radius="xl"
              style={{
                background: '#111827',
                color: 'white',
              }}
            >
              <IconMessage size={20} />
            </Avatar>
            <Text fw={600} size="md" c="#111827">
              Support Dashboard
            </Text>
          </Group>
          <Group gap="sm">
            <Text size="sm" c="#6b7280">
              {staffName}
            </Text>
            <ActionIcon
              onClick={onLogout}
              variant="subtle"
              c="#6b7280"
              size="md"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Box>
      </AppShell.Header>

      <AppShell.Navbar>
        <Box
          p="md"
          style={{
            borderBottom: '1px solid #e5e7eb',
            background: 'white',
          }}
        >
          <Group justify="space-between">
            <Text size="sm" fw={600} c="#111827">
              Escalated Chats
            </Text>
            <Badge
              size="sm"
              variant="filled"
              color="#111827"
              style={{
                background: '#111827',
              }}
            >
              {chats.length}
            </Badge>
          </Group>
        </Box>

        <ScrollArea style={{ flex: 1, background: '#fafafa' }} p="xs">
          <Stack gap="xs">
            {chats.length === 0 ? (
              <Stack align="center" gap="sm" py="xl" px="md">
                <Avatar
                  size={48}
                  radius="xl"
                  style={{
                    background: '#f3f4f6',
                    color: '#9ca3af',
                  }}
                >
                  <IconMessage size={24} />
                </Avatar>
                <Stack gap={4} align="center">
                  <Text size="sm" fw={500} c="#6b7280" ta="center">
                    No escalated chats
                  </Text>
                  <Text size="xs" c="#9ca3af" ta="center">
                    AI is handling all conversations
                  </Text>
                </Stack>
              </Stack>
            ) : (
              chats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                const isAssignedToMe = chat.assignedStaff === staffName;
                const isUnassigned = !chat.assignedStaff || chat.assignedStaff === 'ai' || chat.assignedStaff === '';

                return (
                  <UnstyledButton
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: isSelected ? '#111827' : 'white',
                      color: isSelected ? 'white' : 'inherit',
                      border: isSelected ? 'none' : '1px solid #e5e7eb',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar
                        size={40}
                        radius="xl"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
                          color: isSelected ? 'white' : '#6b7280',
                          fontWeight: 600,
                        }}
                      >
                        {chat.author?.[0]?.toUpperCase() || 'A'}
                      </Avatar>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          fw={600}
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isSelected ? 'white' : '#111827',
                          }}
                        >
                          {chat.author || 'Anonymous User'}
                        </Text>
                        {isUnassigned ? (
                          <Badge
                            size="xs"
                            variant="filled"
                            color={isSelected ? 'white' : '#ef4444'}
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.2)' : '#ef4444',
                              color: isSelected ? 'white' : 'white',
                              marginTop: 4,
                            }}
                          >
                            Unassigned
                          </Badge>
                        ) : isAssignedToMe ? (
                          <Badge
                            size="xs"
                            variant="filled"
                            color={isSelected ? 'white' : '#10b981'}
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.2)' : '#10b981',
                              color: 'white',
                              marginTop: 4,
                            }}
                          >
                            You
                          </Badge>
                        ) : (
                          <Text size="xs" c={isSelected ? 'rgba(255,255,255,0.7)' : '#9ca3af'} mt={2}>
                            {chat.assignedStaff}
                          </Text>
                        )}
                      </Box>
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
            gap="md"
            style={{
              height: '100%',
              background: '#fafafa',
            }}
          >
            <Avatar
              size={80}
              radius="xl"
              style={{
                background: '#f3f4f6',
                color: '#9ca3af',
              }}
            >
              <IconMessage size={40} />
            </Avatar>
            <Stack gap={4} align="center">
              <Text size="lg" fw={600} c="#111827">
                Select a conversation
              </Text>
              <Text size="sm" c="#6b7280" ta="center" maw={280}>
                Choose a chat from the sidebar to start helping
              </Text>
            </Stack>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default StaffDashboard;
