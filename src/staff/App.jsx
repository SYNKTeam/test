import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import '../index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffUser, setStaffUser] = useState(null);

  const handleLogin = (name, user) => {
    setStaffUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setStaffUser(null);
    setIsAuthenticated(false);
  };

  return (
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
              <StaffDashboard staffUser={staffUser} onLogout={handleLogout} /> :
              <Navigate to="/staff" />
          }
        />
        <Route path="*" element={<Navigate to="/staff" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
