import React, { useState } from 'react';
import { LogOut, Sparkles, Moon, Sun, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { request } from '../../services/api';

const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const { activeWorkspace, members, isAdmin, refreshWorkspaces } = useWorkspace();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'workspace'
  const [name, setName] = useState(user?.name || '');
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || '');
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await updateProfile({ name: name.trim() });
      setStatusMsg('Profile name updated.');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  const handleUpdateWorkspaceName = async (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    try {
      await request(`/workspaces/${activeWorkspace.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      refreshWorkspaces();
      setStatusMsg('Workspace name updated.');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Failed to update workspace:', err);
    }
  };

  const handleLoadSampleTasks = async () => {
    try {
      await request(`/workspaces/${activeWorkspace.id}/sample-tasks`, { method: 'POST' });
      setStatusMsg('Sample tasks loaded into board.');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Failed to load sample tasks:', err);
    }
  };

  const handleExportJson = async () => {
    try {
      const tasks = await request('/tasks');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `duster_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleClearAllTasks = async () => {
    if (!window.confirm('Irreversible! Erase every task in this workspace?')) return;
    try {
      await request(`/workspaces/${activeWorkspace.id}/clear-tasks`, { method: 'POST' });
      setStatusMsg('All tasks cleared.');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Clear tasks failed:', err);
    }
  };

  const getInitials = (val) => {
    if (!val) return 'DU';
    const parts = val.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return val.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: 880 }}>
      {/* Settings Tab Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="terminal-comment">{"// configuration"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
            settings
          </h1>
        </div>

        {/* Tab switchers */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)',
            padding: 2,
          }}
        >
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 2,
              color: activeTab === 'profile' ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: activeTab === 'profile' ? 'var(--surface-active)' : 'transparent',
            }}
          >
            profile
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 2,
              color: activeTab === 'workspace' ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: activeTab === 'workspace' ? 'var(--surface-active)' : 'transparent',
            }}
          >
            workspace
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 16 }}>
          [✓ {statusMsg}]
        </div>
      )}

      {/* Profile Settings (Screenshot 18) */}
      {activeTab === 'profile' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
          {/* Profile Card */}
          <div className="terminal-card">
            <div
              style={{
                width: 100,
                height: 100,
                backgroundColor: '#65a30d',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: 32,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {getInitials(user?.name)}
            </div>

            <form onSubmit={handleUpdateName}>
              <label className="form-label">your name</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ flex: 1, padding: '6px 8px' }}
                />
                <button type="submit" className="btn-command" style={{ padding: '6px 10px' }}>
                  [ ✓ ]
                </button>
              </div>
            </form>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              <div>SIGNED IN AS</div>
              <div style={{ color: 'var(--text)', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>

          {/* Preferences & Account Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Appearance Theme Selector */}
            <div className="terminal-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Appearance</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
                Your theme follows you across every workspace.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'terminal', label: 'Terminal', icon: Terminal },
                ].map((th) => {
                  const Icon = th.icon;
                  const isSelected = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th.id)}
                      style={{
                        padding: '16px 10px',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-card)',
                        backgroundColor: isSelected ? 'var(--surface-active)' : 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        color: isSelected ? 'var(--accent)' : 'var(--text)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={18} />
                      <span>{th.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account / Sign out */}
            <div className="terminal-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Account</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
                You sign in with a one-time code — no password to manage.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>sign out</span>
                <button className="btn-command" onClick={logout} style={{ gap: 8 }}>
                  <LogOut size={13} />
                  <span>[ ↳ sign out ]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Workspace Settings (Screenshot 12) */
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
          {/* Workspace Info Card */}
          <div className="terminal-card">
            <div
              style={{
                width: 100,
                height: 100,
                backgroundColor: '#9a3412',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: 32,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {getInitials(activeWorkspace?.name)}
            </div>

            <form onSubmit={handleUpdateWorkspaceName}>
              <label className="form-label">workspace name</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  style={{ flex: 1, padding: '6px 8px' }}
                />
                <button type="submit" className="btn-command" style={{ padding: '6px 10px' }}>
                  [ ✓ ]
                </button>
              </div>
            </form>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              👥 {members.length} collaborator{members.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Collaborators List */}
            <div className="terminal-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Collaborators</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                {members.length} person has access. Invite more from the sidebar.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((m) => (
                  <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ backgroundColor: '#65a30d', color: '#fff', padding: '2px 5px', fontSize: 10, fontWeight: 700, borderRadius: 2 }}>
                        {getInitials(m.name)}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>
                        {m.name} {m.userId === user?.id && '(you)'}
                      </span>
                    </div>
                    <span className="badge-priority p2" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                      {m.isOwner ? 'owner' : m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data & Backup */}
            <div className="terminal-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Data & backup</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
                Move tasks in and out, or snapshot the whole board.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>backup (json)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Raw JSON snapshot of every task in this workspace.
                    </div>
                  </div>
                  <button className="btn-command" onClick={handleExportJson}>
                    [ ↓ export json ]
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>sample tasks</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Fill this workspace with an example board to explore the views.
                    </div>
                  </div>
                  <button className="btn-command accent" onClick={handleLoadSampleTasks}>
                    <Sparkles size={12} />
                    <span>[ load sample tasks ]</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            {isAdmin && (
              <div className="terminal-card" style={{ border: '1px solid rgba(255, 73, 63, 0.3)' }}>
                <div style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Danger zone</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                  Irreversible, and it affects everyone in the workspace.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>clear all tasks</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Erases every task in this workspace.
                    </div>
                  </div>
                  <button className="btn-command danger" onClick={handleClearAllTasks}>
                    [ 🗑 clear all tasks ]
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
