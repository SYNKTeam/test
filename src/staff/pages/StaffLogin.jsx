import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextInput,
  Button,
  Text,
  Avatar,
  Stack
} from '@mantine/core';
import { IconHeadset } from '@tabler/icons-react';

function StaffLogin({ onLogin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}
    >
      <Container size="sm">
        <Paper
          p="xl"
          style={{
            textAlign: 'center',
            border: '1px solid #e9ecef',
          }}
        >
          <Stack align="center" gap="lg">
            <Avatar
              size={80}
              color="teal"
            >
              <IconHeadset size={48} />
            </Avatar>

            <div>
              <Text size="xl" fw={600} mb="xs">
                Staff Login
              </Text>

              <Text c="dimmed" mb="xl">
                Enter your name to access the support dashboard
              </Text>
            </div>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Stack gap="md">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  size="md"
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={!name.trim()}
                  color="teal"
                >
                  Access Dashboard
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default StaffLogin;
