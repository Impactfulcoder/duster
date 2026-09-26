import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderArchive,
  FolderClosed,
  Vote,
  MessageSquare,
  Activity,
  BarChart3,
  Settings,
  UserPlus,
  LogOut,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import InviteModal from '../common/InviteModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { workspaces, activeWorkspace, selectWorkspace, createWorkspace, members } = useWorkspace();
  const navigate = useNavigate();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showNewWorkspaceInput, setShowNewWorkspaceInput] = useState(false);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    await createWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setShowNewWorkspaceInput(false);
    setIsWorkspaceMenuOpen(false);
  };

  const navItems = [
    { to: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'tasks', icon: CheckSquare },
    { to: '/calendar', label: 'calendar', icon: Calendar },
    { to: '/content', label: 'content', icon: FolderClosed },
    { to: '/polls', label: 'polls', icon: Vote },
    { to: '/chat', label: 'chat', icon: MessageSquare },
    { to: '/activity', label: 'activity', icon: Activity },
    { to: '/analytics', label: 'analytics', icon: BarChart3 },
    { to: '/archive', label: 'archive', icon: FolderArchive },
    { to: '/settings', label: 'settings', icon: Settings },
  ];

  const getInitials = (name) => {
    if (!name) return 'DU';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          userSelect: 'none',
          zIndex: 100,
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '18px 16px 12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, letterSpacing: '1px' }}>
            DUSTER
          </span>
        </div>

        {/* Workspace Dropdown */}
        <div style={{ padding: '0 12px 12px 12px', position: 'relative' }}>
          <button
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span
                style={{
                  backgroundColor: '#9a3412',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 5px',
                  borderRadius: 2,
                }}
              >
                {getInitials(activeWorkspace?.name || 'WS')}
              </span>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activeWorkspace?.name || 'My Workspace'}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Workspace Switcher Menu */}
          {isWorkspaceMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 12,
                right: 12,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-focus)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 1000,
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                {workspaces.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      selectWorkspace(w.id);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: w.id === activeWorkspace?.id ? 'var(--surface-active)' : 'transparent',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                    }}
                  >
                    <span>{w.name}</span>
                    {w.role === 'admin' && (
                      <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>admin</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', padding: 6 }}>
                {!showNewWorkspaceInput ? (
                  <button
                    onClick={() => setShowNewWorkspaceInput(true)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Plus size={12} />
                    <span>[ + new workspace ]</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      placeholder="Workspace name"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
                      autoFocus
                    />
                    <button type="submit" className="btn-command accent" style={{ padding: '4px 8px' }}>
                      ok
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-btn)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--surface-active)' : 'transparent',
                  marginBottom: 2,
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                })}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Collaborator Invite Widget */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--success)',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          <button
            onClick={() => setIsInviteOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '6px 8px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            <UserPlus size={13} style={{ color: 'var(--accent)' }} />
            <span>invite collaborator</span>
          </button>
        </div>

        {/* Current User Pill */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            onClick={() => navigate('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', overflow: 'hidden' }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 3,
                backgroundColor: '#65a30d',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name || 'User'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  );
};

export default Sidebar;
