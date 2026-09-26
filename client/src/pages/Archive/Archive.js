import React, { useState, useEffect, useCallback } from 'react';
import { Archive as ArchiveIcon, RotateCcw } from 'lucide-react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const Archive = () => {
  const { activeWorkspace } = useWorkspace();
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const data = await request('/tasks?isArchived=true');
      setArchivedTasks(data);
    } catch (err) {
      console.error('Failed to load archived tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const handleRestore = async (taskId) => {
    try {
      await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: false }),
      });
      fetchArchived();
    } catch (err) {
      console.error('Failed to restore task:', err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="terminal-comment">{"// cold storage"}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
          archive
        </h1>
      </div>

      <div
        className="terminal-card"
        style={{
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 40,
        }}
      >
        {loading ? (
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            [ loading cold storage... ]
          </div>
        ) : archivedTasks.length === 0 ? (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                backgroundColor: 'var(--surface-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginBottom: 16,
              }}
            >
              <ArchiveIcon size={24} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              archive is empty
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              Archived tasks land here. Restore them any time.
            </p>
          </>
        ) : (
          <div style={{ width: '100%', maxWidth: 700, textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {archivedTasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{t.title}</span>
                  <button
                    className="btn-command"
                    onClick={() => handleRestore(t._id)}
                    style={{ padding: '4px 8px' }}
                  >
                    <RotateCcw size={12} />
                    <span>[ restore ]</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Archive;
