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
        background: 'linear-gradient(135deg, #00bfa5 0%, #00695c 100%)'
      }}
    >
      <Container size="xs">
        <Paper
          p="xl"
          radius="lg"
          shadow="xl"
          style={{
            textAlign: 'center',
          }}
        >
          <Stack align="center" gap="lg">
            <Avatar
              size={80}
              color="teal"
              variant="gradient"
              gradient={{ from: 'teal', to: 'cyan', deg: 45 }}
            >
              <IconHeadset size={48} />
            </Avatar>

            <div>
              <Text size="xl" fw={700} mb="xs">
                Staff Portal
              </Text>

              <Text c="dimmed" size="sm">
                Sign in to access the support dashboard
              </Text>
            </div>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" w="100%">
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
                />

                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  size="md"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  color="teal"
                  variant="gradient"
                  gradient={{ from: 'teal', to: 'cyan', deg: 45 }}
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
