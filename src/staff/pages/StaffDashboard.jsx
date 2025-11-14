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
    setSelectedChat(chat);

    // Auto-assign staff if not already assigned
    if (!chat.assignedStaff || chat.assignedStaff === '') {
      try {
        await axios.post(`${API_URL}/chats/${chat.id}/assign`, {
          staffName: staffName
        });
        // Reload chats to update the assignment
        loadChats();
      } catch (error) {
        console.error('Failed to assign staff:', error);
      }
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
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e9ecef',
            background: 'linear-gradient(135deg, #00bfa5 0%, #00897b 100%)'
          }}
        >
          <Group>
            <Avatar
              size="md"
              variant="gradient"
              gradient={{ from: 'teal', to: 'cyan', deg: 135 }}
            >
              <IconMessage size={24} />
            </Avatar>
            <div>
              <Title order={3} c="white" style={{ margin: 0 }}>
                Support Dashboard
              </Title>
              <Text size="xs" c="rgba(255,255,255,0.8)">
                Real-time customer support
              </Text>
            </div>
          </Group>
          <Group>
            <Badge
              leftSection={
                <Avatar size={18} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  <IconUser size={10} />
                </Avatar>
              }
              size="lg"
              variant="light"
              color="white"
              style={{ color: 'white' }}
            >
              {staffName}
            </Badge>
            <ActionIcon onClick={onLogout} variant="light" color="white" size="lg">
              <IconLogout size={20} />
            </ActionIcon>
          </Group>
        </Box>
      </AppShell.Header>

      <AppShell.Navbar>
        <Box
          p="md"
          style={{
            borderBottom: '1px solid #e9ecef',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)'
          }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="lg" fw={700}>
              Conversations
            </Text>
            <Badge
              size="lg"
              variant="filled"
              color="teal"
              style={{ borderRadius: '12px' }}
            >
              {chats.length}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Active support chats
          </Text>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="xs">
          <Stack gap="xs">
            {chats.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" mt="xl" px="md">
                No active chats. Waiting for customers...
              </Text>
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
                      padding: '0.875rem',
                      borderRadius: '12px',
                      background: isSelected
                        ? 'linear-gradient(135deg, #00bfa5 0%, #00897b 100%)'
                        : 'white',
                      color: isSelected ? 'white' : 'inherit',
                      transition: 'all 0.2s',
                      border: isSelected ? 'none' : '1px solid #e9ecef',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(0, 191, 165, 0.3)'
                        : 'none'
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Indicator
                        inline
                        size={12}
                        color="green"
                        processing
                        disabled={!isUnassigned}
                      >
                        <Avatar
                          size={44}
                          radius="xl"
                          color={isSelected ? 'white' : 'gray'}
                          variant={isSelected ? 'light' : 'filled'}
                        >
                          {chat.author?.[0]?.toUpperCase() || 'A'}
                        </Avatar>
                      </Indicator>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          fw={600}
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isSelected ? 'white' : 'inherit'
                          }}
                        >
                          {chat.author || 'Anonymous User'}
                        </Text>
                        <Group gap={4} mt={2}>
                          {isUnassigned ? (
                            <Badge
                              size="xs"
                              variant={isSelected ? 'light' : 'dot'}
                              color={isSelected ? 'white' : 'red'}
                            >
                              Unassigned
                            </Badge>
                          ) : isAssignedToMe ? (
                            <Badge
                              size="xs"
                              variant={isSelected ? 'light' : 'dot'}
                              color={isSelected ? 'white' : 'teal'}
                            >
                              You
                            </Badge>
                          ) : (
                            <Badge
                              size="xs"
                              variant={isSelected ? 'light' : 'dot'}
                              color={isSelected ? 'white' : 'gray'}
                            >
                              {chat.assignedStaff}
                            </Badge>
                          )}
                        </Group>
                      </Box>
                      <IconClock
                        size={16}
                        style={{ opacity: isSelected ? 0.9 : 0.5 }}
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
            style={{ height: '100%', backgroundColor: '#f8f9fa' }}
          >
            <Avatar
              size={120}
              variant="gradient"
              gradient={{ from: 'teal', to: 'cyan', deg: 135 }}
              style={{ opacity: 0.3 }}
            >
              <IconMessage size={60} />
            </Avatar>
            <Text size="xl" fw={600} mt="md" c="dimmed">
              Select a conversation
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Choose a chat from the sidebar to start messaging
            </Text>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default StaffDashboard;
