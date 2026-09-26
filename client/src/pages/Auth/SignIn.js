import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SignIn = () => {
  const { user, requestCode, verifyCode, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleCredential = useCallback(async (response) => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(response.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  // Initialize Google Identity Services button if script loaded
  useEffect(() => {
    if (window.google?.accounts?.id && googleBtnRef.current) {
      try {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'dummy-client-id';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
        });
      } catch (e) {
        // ignore if not configured
      }
    }
  }, [handleGoogleCredential]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await requestCode(email.trim());
      setStep('code');
      if (res.devCode) {
        setDevCodeHint(res.devCode);
        setCode(res.devCode); // Pre-fill for instant seamless developer testing
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyCode(email.trim(), code.trim(), name.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 420,
          backgroundColor: '#121215',
          border: '1px solid #222228',
          borderRadius: 8,
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: 'var(--accent)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 16,
              color: '#ffffff',
              letterSpacing: '1px',
            }}
          >
            DUSTER
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f4f4f5', marginBottom: 8 }}>
          Sign in to Duster
        </h1>
        <p style={{ color: '#85858d', fontSize: 13, lineHeight: 1.5, marginBottom: 28 }}>
          Continue with Google, or we'll email you a 6-digit code. No password either way.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(255, 73, 63, 0.1)',
              border: '1px solid #ff493f',
              color: '#ff493f',
              padding: '8px 12px',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              marginBottom: 20,
              textAlign: 'left',
            }}
          >
            [error: {error}]
          </div>
        )}

        {/* Google Sign In Container */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div ref={googleBtnRef}>
            <button
              onClick={() => {
                // If Google Client ID is not configured, give a helpful prompt
                setError('Google Client ID not configured in .env. Use instant email code below.');
              }}
              style={{
                width: 320,
                height: 40,
                backgroundColor: '#ffffff',
                color: '#1f1f1f',
                borderRadius: 20,
                border: '1px solid #747775',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                fontFamily: 'Roboto, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* OR Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
            color: '#52525b',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: '#222228' }} />
          <span>OR</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#222228' }} />
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} style={{ textAlign: 'left' }}>
            <label
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: '#85858d',
                display: 'block',
                marginBottom: 6,
                letterSpacing: '0.5px',
              }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#17171c',
                border: '1px solid #2a2a32',
                borderRadius: 4,
                color: '#f4f4f5',
                fontSize: 13,
                marginBottom: 16,
              }}
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#993a34',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Mail size={16} />
              <span>{loading ? 'Sending code...' : 'Send verification code'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: '#85858d',
                  letterSpacing: '0.5px',
                }}
              >
                6-DIGIT VERIFICATION CODE
              </label>
              <button
                type="button"
                onClick={() => setStep('email')}
                style={{ color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              >
                edit email
              </button>
            </div>

            {devCodeHint && (
              <div
                style={{
                  backgroundColor: 'rgba(215, 255, 47, 0.1)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 12,
                }}
              >
                Dev Code: <strong>{devCodeHint}</strong> (pre-filled)
              </div>
            )}

            <input
              type="text"
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#17171c',
                border: '1px solid #2a2a32',
                borderRadius: 4,
                color: '#f4f4f5',
                fontSize: 16,
                letterSpacing: 4,
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                marginBottom: 14,
              }}
              autoFocus
            />

            <label
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: '#85858d',
                display: 'block',
                marginBottom: 6,
              }}
            >
              YOUR NAME (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#17171c',
                border: '1px solid #2a2a32',
                borderRadius: 4,
                color: '#f4f4f5',
                fontSize: 13,
                marginBottom: 16,
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'var(--accent)',
                color: '#09090b',
                border: 'none',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{loading ? 'Verifying...' : 'Verify & Enter Workspace'}</span>
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, fontSize: 11, color: '#52525b', lineHeight: 1.5 }}>
          First time here? Signing in creates your account and an empty workspace.
        </div>
      </div>
    </div>
  );
};

export default SignIn;
