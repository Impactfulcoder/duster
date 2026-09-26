import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Terminal as TerminalIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import TaskModal from '../common/TaskModal';
import { request } from '../../services/api';

const Topbar = ({ onTaskCreated }) => {
  const { theme, setTheme } = useTheme();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cycleTheme = () => {
    if (theme === 'terminal') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('terminal');
  };

  const handleCreateTask = async (taskData) => {
    await request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    if (onTaskCreated) onTaskCreated();
  };

  const formatDate = () => {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  };

  return (
    <>
      <header
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 360 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search tasks, notes, #tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 10,
              height: 32,
              borderRadius: 'var(--radius-btn)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {formatDate()}
          </span>

          <button
            title="Notifications"
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={16} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            style={{
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'terminal' ? (
              <TerminalIcon size={16} style={{ color: 'var(--accent)' }} />
            ) : theme === 'dark' ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} />
            )}
          </button>

          {/* [ + new ] Button */}
          <button
            className="btn-command"
            onClick={() => setIsNewTaskOpen(true)}
            style={{ fontWeight: 600, padding: '5px 12px' }}
          >
            [ + new ]
          </button>
        </div>
      </header>

      <TaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSave={handleCreateTask}
      />
    </>
  );
};

export default Topbar;
