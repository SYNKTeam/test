import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Avatar,
  Stack,
  Alert
} from '@mantine/core';
import { IconHeadset, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';

function StaffLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/staff/login', {
        email: email.trim(),
        password: password
      });

      onLogin(response.data.user.name || response.data.user.email, response.data.user);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
      }}
    >
      <Container size="xs">
        <Paper
          p="48px"
          radius="12px"
          style={{
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Stack align="center" gap="xl">
            <Avatar
              size={72}
              radius="xl"
              style={{
                background: '#111827',
                color: 'white',
              }}
            >
              <IconHeadset size={40} />
            </Avatar>

            <Stack gap="xs" align="center">
              <Text fw={600} size="xl" c="#111827">
                Staff Portal
              </Text>
              <Text size="sm" c="#6b7280">
                Sign in to access the support dashboard
              </Text>
            </Stack>

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                w="100%"
                radius="8px"
                styles={{
                  root: {
                    border: '1px solid #fecaca',
                  }
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Stack gap="md">
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  size="md"
                  autoFocus
                  type="email"
                  required
                  styles={{
                    input: {
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      '&:focus': {
                        borderColor: '#111827',
                      }
                    }
                  }}
                />

                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  size="md"
                  required
                  styles={{
                    input: {
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      '&:focus': {
                        borderColor: '#111827',
                      }
                    }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  radius="8px"
                  style={{
                    background: '#111827',
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  Sign In
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
