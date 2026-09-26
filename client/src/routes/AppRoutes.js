import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import SignIn from '../pages/Auth/SignIn';
import AcceptInvite from '../pages/Invite/AcceptInvite';
import Dashboard from '../pages/Dashboard/Dashboard';
import Tasks from '../pages/Tasks/Tasks';
import CalendarView from '../pages/Calendar/CalendarView';
import Content from '../pages/Content/Content';
import Polls from '../pages/Polls/Polls';
import Chat from '../pages/Chat/Chat';
import Activity from '../pages/Activity/Activity';
import Analytics from '../pages/Analytics/Analytics';
import Archive from '../pages/Archive/Archive';
import Settings from '../pages/Settings/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)' }}>
        [ loading duster session... ]
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="content" element={<Content />} />
        <Route path="polls" element={<Polls />} />
        <Route path="chat" element={<Chat />} />
        <Route path="activity" element={<Activity />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="archive" element={<Archive />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
