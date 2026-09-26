import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { getAuthToken } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    const token = getAuthToken();
    const socketServerUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    const s = io(socketServerUrl, {
      auth: { token },
      withCredentials: true,
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      if (activeWorkspace) {
        s.emit('workspace:join', { workspaceId: activeWorkspace.id });
      }
    });

    s.on('presence:update', ({ userId, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status === 'online',
      }));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, activeWorkspace]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
