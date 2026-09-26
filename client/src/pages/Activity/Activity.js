import React, { useState, useEffect, useCallback } from 'react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const Activity = () => {
  const { activeWorkspace, members } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'created' | 'completed'

  const fetchActivity = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const res = await request(`/activity?type=${typeFilter}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, typeFilter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const formatTimeAgo = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getInitials = (name) => {
    if (!name) return 'DU';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="terminal-comment">{"// history"}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
          activity
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        {/* Left Events Feed */}
        <div className="terminal-card">
          <div className="terminal-comment" style={{ marginBottom: 16 }}>TODAY</div>

          {loading && !data ? (
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: 20 }}>
              [ loading activity history... ]
            </div>
          ) : data?.events?.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: 20 }}>
              No recorded activity yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data?.events?.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 3,
                        backgroundColor: '#65a30d',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(evt.actor?.name)}
                    </div>

                    <div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--text)' }}>{evt.actor?.name}</strong>{' '}
                        <span style={{ color: 'var(--text-muted)' }}>{evt.title}</span>
                      </div>
                      {evt.entityType === 'task' && (
                        <div
                          style={{
                            marginTop: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: 3,
                            padding: '2px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span>≡</span>
                          <span>{evt.title.replace(/^created |^updated |^completed /i, '').replace(/"/g, '')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    {formatTimeAgo(evt.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Stats Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Workspace Stats Widget */}
          <div className="terminal-card">
            <div className="terminal-comment">{"// this workspace"}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {data?.summary?.totalEvents || 0}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  EVENTS
                </div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {data?.summary?.todayEvents || 0}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  TODAY
                </div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {members.length || 1}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  PEOPLE
                </div>
              </div>
            </div>
          </div>

          {/* People Widget */}
          <div className="terminal-card">
            <div className="terminal-comment">{"// people"}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {members.map((m) => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 2,
                        backgroundColor: '#65a30d',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getInitials(m.name)}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>
                      {m.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {data?.summary?.totalEvents || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter by Type Widget */}
          <div className="terminal-card">
            <div className="terminal-comment">{"// filter by type"}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className={`btn-command ${typeFilter === 'created' ? 'accent' : ''}`}
                onClick={() => setTypeFilter(typeFilter === 'created' ? 'all' : 'created')}
                style={{ fontSize: 11 }}
              >
                created
              </button>
              <button
                className={`btn-command ${typeFilter === 'completed' ? 'accent' : ''}`}
                onClick={() => setTypeFilter(typeFilter === 'completed' ? 'all' : 'completed')}
                style={{ fontSize: 11 }}
              >
                completed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activity;
