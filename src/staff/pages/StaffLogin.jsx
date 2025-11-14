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
  const [loading, setLoading] = useState(false);

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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
      }}
    >
      <Container size="xs">
        <Paper
          p="2.5rem"
          radius="20px"
          style={{
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Stack align="center" gap="xl">
            <Box style={{ position: 'relative', padding: '1rem' }}>
              <Box
                style={{
                  position: 'absolute',
                  inset: -20,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  opacity: 0.15,
                  filter: 'blur(30px)',
                }}
              />
              <Avatar
                size={100}
                radius="xl"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                }}
              >
                <IconHeadset size={54} />
              </Avatar>
            </Box>

            <Stack gap="xs" align="center">
              <Text size="28px" fw={700} c="#1e293b">
                Staff Portal
              </Text>
              <Text c="dimmed" size="sm" fw={500}>
                Sign in to access the support dashboard
              </Text>
            </Stack>

            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
                w="100%"
                radius="md"
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
              <Stack gap="lg">
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  size="lg"
                  autoFocus
                  type="email"
                  required
                  styles={{
                    input: {
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '15px',
                      padding: '14px 18px',
                      transition: 'all 0.2s',
                      '&:focus': {
                        borderColor: '#667eea',
                        boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                      }
                    }
                  }}
                />

                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  size="lg"
                  required
                  styles={{
                    input: {
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '15px',
                      padding: '14px 18px',
                      transition: 'all 0.2s',
                      '&:focus': {
                        borderColor: '#667eea',
                        boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                      }
                    }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  radius="12px"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '16px',
                    fontWeight: 600,
                    padding: '14px',
                    height: 'auto',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                    }
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
