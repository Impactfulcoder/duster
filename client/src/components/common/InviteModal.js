import React, { useState } from 'react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const InviteModal = ({ isOpen, onClose }) => {
  const { activeWorkspace, refreshMembers } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await request(`/workspaces/${activeWorkspace.id}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      setInviteResult({
        ...data,
        fullUrl,
      });
      refreshMembers();
    } catch (err) {
      setError(err.message || 'Failed to create invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteResult?.fullUrl) {
      navigator.clipboard.writeText(inviteResult.fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setInviteResult(null);
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {copied && (
          <div className="celebration-toast">
            <span>✦</span>
            <span>Invite link copied</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="terminal-comment">{"// collaborators"}</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
              {inviteResult ? 'share this link' : 'invite someone'}
            </h2>
          </div>
          <button onClick={handleClose} style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
            [error: {error}]
          </div>
        )}

        {!inviteResult ? (
          <form onSubmit={handleCreateInvite}>
            <div className="form-group">
              <label className="form-label">email address</label>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">Member — can create and edit permitted tasks & content</option>
                <option value="admin">Admin — full workspace control, members, and settings</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" className="btn-command" onClick={handleClose} disabled={loading}>
                [ cancel ]
              </button>
              <button type="submit" className="btn-command accent" disabled={loading}>
                {loading ? '[ generating... ]' : '[ ↔ create invite link ]'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Send this to <strong style={{ color: 'var(--text)' }}>{inviteResult.email}</strong>. It only works for that address, and it expires in 7 days.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-btn)',
                marginBottom: 20,
              }}
            >
              <input
                type="text"
                readOnly
                value={inviteResult.fullUrl}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: 12,
                  outline: 'none',
                  textOverflow: 'ellipsis',
                }}
              />
              <button type="button" className="btn-command accent" onClick={handleCopy}>
                [ ⧉ copy ]
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-command" onClick={handleClose}>
                [ done ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteModal;
