import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import '../fonts.css';
import '@mantine/core/styles.css';

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
    <MantineProvider theme={theme}>
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
    </MantineProvider>
  );
}

export default App;
