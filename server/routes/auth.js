const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const OtpCode = require('../models/OtpCode');
const RefreshSession = require('../models/RefreshSession');
const requireAuth = require('../middleware/auth');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../utils/tokens');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// Helper to set refresh token cookie
const setRefreshCookie = (res, rawToken, expiresAt) => {
  res.cookie('duster_refresh_token', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: expiresAt,
  });
};

// Helper: Ensure a user has at least one default workspace
const ensureUserWorkspace = async (user) => {
  let membership = await WorkspaceMember.findOne({ userId: user._id });
  if (!membership) {
    const workspace = await Workspace.create({
      name: `${user.name.split(' ')[0]}'s Workspace`,
      ownerId: user._id,
      isDefault: true,
    });
    membership = await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: 'admin',
    });
  }
  return membership;
};

// POST /api/auth/request-code
router.post('/request-code', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpCode.deleteMany({ email: cleanEmail });
    await OtpCode.create({ email: cleanEmail, code, expiresAt });

    console.log(`\n========================================`);
    console.log(`[DUSTER AUTH OTP] Code for ${cleanEmail}: ${code}`);
    console.log(`========================================\n`);

    res.json({
      message: 'Verification code sent.',
      email: cleanEmail,
      // Dev helper for convenience
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-code
router.post('/verify-code', async (req, res, next) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await OtpCode.findOne({ email: cleanEmail, code: code.trim() });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Clean up used OTP
    await OtpCode.deleteOne({ _id: otpRecord._id });

    // Upsert user
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const defaultName = name || cleanEmail.split('@')[0];
      user = await User.create({
        email: cleanEmail,
        name: defaultName,
        authProvider: 'otp',
      });
    }

    await ensureUserWorkspace(user);

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken(user);

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshCookie(res, rawToken, expiresAt);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        themePreference: user.themePreference,
      },
      token: accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
  try {
    const { credential, client_id } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential (ID token) required.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: client_id || process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (gErr) {
      // In dev mode, if mock or token verification failed due to client ID mismatch, handle gracefully
      console.warn('Google verification notice:', gErr.message);
      return res.status(400).json({ error: 'Google ID token verification failed: ' + gErr.message });
    }

    const { email, name, picture, sub } = payload;
    const cleanEmail = email.toLowerCase().trim();

    let user = await User.findOne({ $or: [{ googleSub: sub }, { email: cleanEmail }] });
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        avatarUrl: picture || '',
        googleSub: sub,
        authProvider: 'google',
      });
    } else {
      user.googleSub = sub;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      await user.save();
    }

    await ensureUserWorkspace(user);

    const accessToken = generateAccessToken(user);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken(user);

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshCookie(res, rawToken, expiresAt);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        themePreference: user.themePreference,
      },
      token: accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = req.cookies.duster_refresh_token;
    if (!rawToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const currentHash = hashToken(rawToken);
    const session = await RefreshSession.findOne({ tokenHash: currentHash });

    if (!session || session.expiresAt < new Date()) {
      if (session) await RefreshSession.deleteOne({ _id: session._id });
      res.clearCookie('duster_refresh_token');
      return res.status(401).json({ error: 'Refresh session expired or invalid.' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      await RefreshSession.deleteOne({ _id: session._id });
      res.clearCookie('duster_refresh_token');
      return res.status(401).json({ error: 'User not found.' });
    }

    // Refresh token rotation
    await RefreshSession.deleteOne({ _id: session._id });
    const { rawToken: newRawToken, tokenHash: newHash, expiresAt } = generateRefreshToken(user);
    await RefreshSession.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt,
    });

    setRefreshCookie(res, newRawToken, expiresAt);

    const newAccessToken = generateAccessToken(user);

    res.json({
      token: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        themePreference: user.themePreference,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies.duster_refresh_token;
    if (rawToken) {
      const currentHash = hashToken(rawToken);
      await RefreshSession.deleteMany({ tokenHash: currentHash });
    }
    res.clearCookie('duster_refresh_token');
    res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      themePreference: req.user.themePreference,
    },
  });
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, avatarUrl, themePreference } = req.body;
    if (name) req.user.name = name.trim();
    if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
    if (themePreference && ['terminal', 'dark', 'light'].includes(themePreference)) {
      req.user.themePreference = themePreference;
    }
    await req.user.save();

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        themePreference: req.user.themePreference,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
