import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppShell from './components/layout/AppShell';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/HomePage';
import CreateSpacePage from './pages/spaces/CreateSpacePage';
import SpaceDetailPage from './pages/spaces/SpaceDetailPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import ContributionPage from './pages/contributions/ContributionPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/spaces/new" element={<ProtectedRoute><CreateSpacePage /></ProtectedRoute>} />
        <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetailPage /></ProtectedRoute>} />
        <Route path="/sessions/:id" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
        <Route path="/contributions" element={<ProtectedRoute><ContributionPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
