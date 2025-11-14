import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Avatar
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

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
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              margin: '0 auto 24px',
              bgcolor: 'primary.main'
            }}
          >
            <SupportAgentIcon sx={{ fontSize: 48 }} />
          </Avatar>

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Staff Login
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Enter your name to access the support dashboard
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              variant="outlined"
              autoFocus
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={!name.trim()}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Access Dashboard
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

export default StaffLogin;
