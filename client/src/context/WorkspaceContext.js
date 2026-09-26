import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { request, setActiveWorkspaceHeader, getActiveWorkspaceId } from '../services/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      const data = await request('/workspaces');
      setWorkspaces(data);

      if (data.length > 0) {
        const storedId = getActiveWorkspaceId();
        const found = data.find((w) => w.id === storedId);
        const selected = found || data[0];
        setActiveWorkspace(selected);
        setActiveWorkspaceHeader(selected.id);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch members of current active workspace
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([]);
      return;
    }

    try {
      const data = await request(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch workspace members:', err);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const selectWorkspace = (workspaceId) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setActiveWorkspace(found);
      setActiveWorkspaceHeader(found.id);
    }
  };

  const createWorkspace = async (name) => {
    const created = await request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setWorkspaces((prev) => [...prev, created]);
    setActiveWorkspace(created);
    setActiveWorkspaceHeader(created.id);
    return created;
  };

  const currentMember = members.find((m) => m.userId === user?.id);
  const isAdmin = activeWorkspace?.role === 'admin' || currentMember?.role === 'admin';

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        members,
        loading,
        isAdmin,
        selectWorkspace,
        createWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        refreshMembers: fetchMembers,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
