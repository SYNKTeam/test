import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Text,
  Avatar,
  Badge,
  ActionIcon,
  Group,
  Stack,
  ScrollArea,
  UnstyledButton
} from '@mantine/core';
import {
  IconMessage,
  IconLogout,
  IconUser
} from '@tabler/icons-react';
import ChatWindow from '../components/ChatWindow';
import axios from 'axios';

const API_URL = '/api';
const isDev = import.meta.env.DEV;
const WS_URL = isDev ? 'ws://localhost:3001' : `ws://${window.location.host}`;

function StaffDashboard({ staffName, onLogout }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [ws, setWs] = useState(null);

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

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e9ecef',
          padding: '1rem 1.5rem'
        }}
      >
        <Group justify="space-between">
          <Group>
            <Avatar size="md" color="teal">
              <IconMessage size={20} />
            </Avatar>
            <Text size="lg" fw={600}>
              Support Dashboard
            </Text>
          </Group>
          <Group>
            <Badge
              leftSection={
                <Avatar size={20} color="teal.1">
                  <IconUser size={12} />
                </Avatar>
              }
              size="lg"
              variant="light"
              color="teal"
            >
              {staffName}
            </Badge>
            <ActionIcon onClick={onLogout} variant="subtle" color="gray">
              <IconLogout size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Paper
          style={{
            width: 320,
            borderRadius: 0,
            borderRight: '1px solid #e9ecef',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafafa'
          }}
          shadow="none"
        >
          <Box
            p="lg"
            style={{
              borderBottom: '1px solid #e9ecef',
              backgroundColor: 'white'
            }}
          >
            <Text size="lg" fw={600} mb={4}>
              Conversations
            </Text>
            <Text size="sm" c="dimmed">
              {chats.length} active chat{chats.length !== 1 ? 's' : ''}
            </Text>
          </Box>

          <ScrollArea style={{ flex: 1 }} p="xs">
            <Stack gap="xs">
              {chats.map((chat) => (
                <UnstyledButton
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: selectedChat?.id === chat.id ? '#00bfa5' : 'white',
                    color: selectedChat?.id === chat.id ? 'white' : 'inherit',
                    transition: 'all 0.2s',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        backgroundColor: selectedChat?.id === chat.id ? '#008e76' : '#f8f9fa',
                      }
                    }
                  }}
                >
                  <Group>
                    <Avatar size={40} color="gray">
                      {chat.author?.[0]?.toUpperCase() || 'A'}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text fw={500} size="sm">
                        {chat.author || 'Anonymous User'}
                      </Text>
                      <Text
                        size="xs"
                        style={{
                          opacity: selectedChat?.id === chat.id ? 0.9 : 0.6
                        }}
                      >
                        {chat.assignedStaff || 'Unassigned'}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea>
        </Paper>

        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8fafc'
          }}
        >
          {selectedChat ? (
            <ChatWindow chat={selectedChat} staffName={staffName} />
          ) : (
            <Stack
              align="center"
              justify="center"
              style={{ flex: 1 }}
              c="dimmed"
            >
              <IconMessage size={80} opacity={0.3} />
              <Text size="lg" fw={500}>
                Select a conversation
              </Text>
              <Text size="sm" mt="xs">
                Choose a chat from the sidebar to start messaging
              </Text>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default StaffDashboard;
