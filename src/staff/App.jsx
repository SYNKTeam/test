import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00bfa5',
      light: '#5df2d6',
      dark: '#008e76',
    },
    secondary: {
      main: '#64748b',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffName, setStaffName] = useState('');

  const handleLogin = (name) => {
    setStaffName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setStaffName('');
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/staff"
            element={
              isAuthenticated ?
                <Navigate to="/staff/dashboard" /> :
                <StaffLogin onLogin={handleLogin} />
            }
          />
          <Route
            path="/staff/dashboard"
            element={
              isAuthenticated ?
                <StaffDashboard staffName={staffName} onLogout={handleLogout} /> :
                <Navigate to="/staff" />
            }
          />
          <Route path="*" element={<Navigate to="/staff" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
