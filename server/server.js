require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { initSocket } = require('./socket/socket');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const inviteRoutes = require('./routes/invites');
const taskRoutes = require('./routes/tasks');
const contentRoutes = require('./routes/content');
const pollRoutes = require('./routes/polls');
const conversationRoutes = require('./routes/conversations');
const activityRoutes = require('./routes/activity');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Connect to Database
connectDB();

// Initialize Socket.IO
initSocket(server, CLIENT_URL);

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Duster API', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Start Server
server.listen(PORT, () => {
  console.log(`[Duster API] Server running on port ${PORT}`);
  console.log(`[Duster API] Client Origin: ${CLIENT_URL}`);
});

module.exports = { app, server };
