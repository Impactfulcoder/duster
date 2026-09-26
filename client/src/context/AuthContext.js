import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { request, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  const checkSession = useCallback(async () => {
    try {
      // First attempt refresh using refresh cookie
      const res = await request('/auth/refresh', { method: 'POST' });
      if (res && res.token) {
        setAuthToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      // Not logged in or expired
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const requestCode = async (email) => {
    return await request('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const verifyCode = async (email, code, name) => {
    const res = await request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, name }),
    });
    setAuthToken(res.token);
    setUser(res.user);
    return res;
  };

  const loginWithGoogle = async (credential, clientId) => {
    const res = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, client_id: clientId }),
    });
    setAuthToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const res = await request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requestCode,
        verifyCode,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
