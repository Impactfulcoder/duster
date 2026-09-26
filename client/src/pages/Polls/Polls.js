import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocket } from '../../context/SocketContext';

const Polls = () => {
  const { activeWorkspace, isAdmin } = useWorkspace();
  const { socket } = useSocket();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New poll form
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollType, setPollType] = useState('single');
  const [anonymous, setAnonymous] = useState(false);

  const fetchPolls = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const data = await request('/polls');
      setPolls(data);
    } catch (err) {
      console.error('Failed to load polls:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Real-time vote updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.on('poll:update', (updatedPoll) => {
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    socket.on('poll:new', (newPoll) => {
      setPolls((prev) => [newPoll, ...prev]);
    });

    socket.on('poll:deleted', ({ pollId }) => {
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    });

    return () => {
      socket.off('poll:update');
      socket.off('poll:new');
      socket.off('poll:deleted');
    };
  }, [socket]);

  const handleVote = async (pollId, optionId, e) => {
    e.preventDefault();
    try {
      await request(`/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIds: [optionId] }),
      });
      fetchPolls();
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await request(`/polls/${pollId}/close`, { method: 'POST' });
      fetchPolls();
    } catch (err) {
      console.error('Failed to close poll:', err);
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await request(`/polls/${pollId}`, { method: 'DELETE' });
      fetchPolls();
    } catch (err) {
      console.error('Failed to delete poll:', err);
    }
  };

  const handleAddOptionField = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (idx, val) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) {
      alert('Please provide a question and at least 2 options.');
      return;
    }

    try {
      await request('/polls', {
        method: 'POST',
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          type: pollType,
          anonymous,
        }),
      });

      setQuestion('');
      setOptions(['', '']);
      setIsCreateOpen(false);
      fetchPolls();
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const activePolls = polls.filter((p) => p.status === 'active');
  const closedPolls = polls.filter((p) => p.status === 'closed');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="terminal-comment">{"// collaborative decision making"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
            polls
          </h1>
        </div>

        <button className="btn-command accent" onClick={() => setIsCreateOpen(true)}>
          <Plus size={13} />
          <span>[ + new poll ]</span>
        </button>
      </div>

      {/* Create Poll Modal */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="terminal-comment">{"// create poll"}</div>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>ask workspace a question</h2>

            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label className="form-label">question</label>
                <input
                  type="text"
                  placeholder="e.g. Where should we hold the next team session?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">options</label>
                {options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      required
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-command"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  onClick={handleAddOptionField}
                >
                  [ + add option ]
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">vote type</label>
                  <select value={pollType} onChange={(e) => setPollType(e.target.value)}>
                    <option value="single">Single Choice</option>
                    <option value="multiple">Multiple Choice</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">anonymity</label>
                  <select value={anonymous ? 'yes' : 'no'} onChange={(e) => setAnonymous(e.target.value === 'yes')}>
                    <option value="no">Public</option>
                    <option value="yes">Anonymous</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-command" onClick={() => setIsCreateOpen(false)}>
                  [ cancel ]
                </button>
                <button type="submit" className="btn-command accent">
                  [ launch poll ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Polls */}
      <div style={{ marginBottom: 32 }}>
        <div className="terminal-comment" style={{ fontSize: 12, marginBottom: 12 }}>
          {`// active polls (${activePolls.length})`}
        </div>

        {loading && !polls.length ? (
          <div className="terminal-card" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            [ loading active polls... ]
          </div>
        ) : activePolls.length === 0 ? (
          <div className="terminal-card" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            No active polls right now. Create one using [ + new poll ].
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {activePolls.map((poll) => (
              <div key={poll.id} className="terminal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                    {poll.question}
                  </h3>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        title="Close poll"
                        className="btn-command"
                        style={{ padding: '2px 6px', fontSize: 10 }}
                        onClick={() => handleClosePoll(poll.id)}
                      >
                        [ close ]
                      </button>
                      <button
                        title="Delete"
                        className="btn-command danger"
                        style={{ padding: '2px 6px' }}
                        onClick={() => handleDeletePoll(poll.id)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {poll.options.map((opt) => {
                    const isSelected = poll.myOptionIds?.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={(e) => handleVote(poll.id, opt.id, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-btn)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          backgroundColor: isSelected ? 'var(--surface-active)' : 'var(--bg)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {isSelected ? '●' : '○'}
                          </span>
                          <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                            {opt.label}
                          </span>
                        </div>
                        {poll.hasVoted && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            {opt.votes} ({opt.percentage}%)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                  <span>{poll.hasVoted ? '✓ you voted' : 'click option to vote'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed Polls */}
      {closedPolls.length > 0 && (
        <div>
          <div className="terminal-comment" style={{ fontSize: 12, marginBottom: 12 }}>
            {`// closed polls (${closedPolls.length})`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {closedPolls.map((poll) => (
              <div key={poll.id} className="terminal-card" style={{ opacity: 0.85 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>
                  {poll.question}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {poll.options.map((opt) => (
                    <div key={opt.id} style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text)' }}>{opt.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{opt.votes} votes ({opt.percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${opt.percentage}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
                  total: {poll.totalVotes} votes • closed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Polls;
