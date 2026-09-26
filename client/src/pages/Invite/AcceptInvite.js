import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { request } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const AcceptInvite = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const { refreshWorkspaces, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const data = await request(`/invites/${token}`);
        setInvite(data);
      } catch (err) {
        setError(err.message || 'Invitation is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setAccepting(true);
    setError('');
    try {
      const res = await request(`/invites/${token}/accept`, { method: 'POST' });
      await refreshWorkspaces();
      selectWorkspace(res.workspaceId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-mono)' }}>
        [ loading invitation... ]
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#121215',
          border: '1px solid #222228',
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div className="terminal-comment">{"// workspace invitation"}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '8px 0 16px' }}>
          Join {invite?.workspaceName || 'Workspace'}
        </h2>

        {error ? (
          <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 20 }}>
            [error: {error}]
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: 'var(--text)' }}>{invite?.inviterName}</strong> has invited you to join{' '}
              <strong style={{ color: 'var(--text)' }}>{invite?.workspaceName}</strong> as a{' '}
              <span className={`badge-priority p2`} style={{ textTransform: 'capitalize' }}>
                {invite?.role}
              </span>.
            </p>

            {user ? (
              <button
                className="btn-command accent"
                onClick={handleAccept}
                disabled={accepting}
                style={{ width: '100%', padding: '10px 16px', fontSize: 13, justifyContent: 'center' }}
              >
                {accepting ? '[ joining workspace... ]' : '[ accept invitation & enter ]'}
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                  You must be signed in to accept this invitation.
                </p>
                <button
                  className="btn-command accent"
                  onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '10px 16px', fontSize: 13, justifyContent: 'center' }}
                >
                  [ sign in to accept ]
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
