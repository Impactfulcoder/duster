const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const WorkspaceMember = require('../models/WorkspaceMember');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

let io = null;

const initSocket = (httpServer, clientUrl) => {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required for websocket'));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return next(new Error('Invalid socket auth token'));
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Join user's personal channel
    socket.join(`user:${userId}`);

    // Join workspace room
    socket.on('workspace:join', async ({ workspaceId }) => {
      try {
        const member = await WorkspaceMember.findOne({
          workspaceId,
          userId: socket.user._id,
        });

        if (member) {
          socket.join(`workspace:${workspaceId}`);
          socket.to(`workspace:${workspaceId}`).emit('presence:update', {
            userId,
            name: socket.user.name,
            status: 'online',
          });
        }
      } catch (err) {
        console.error('Error joining workspace room:', err);
      }
    });

    socket.on('workspace:leave', ({ workspaceId }) => {
      socket.leave(`workspace:${workspaceId}`);
      socket.to(`workspace:${workspaceId}`).emit('presence:update', {
        userId,
        name: socket.user.name,
        status: 'offline',
      });
    });

    // Join conversation room
    socket.on('chat:join', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (conv && conv.participantIds.some((p) => p.toString() === userId)) {
          socket.join(`conversation:${conversationId}`);
        }
      } catch (err) {
        console.error('Error joining chat room:', err);
      }
    });

    socket.on('chat:leave', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send real-time message
    socket.on('message:send', async ({ conversationId, text, attachments }) => {
      try {
        if (!text || !text.trim()) return;

        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participantIds.some((p) => p.toString() === userId)) {
          return socket.emit('error', { message: 'Unauthorized to send to this conversation.' });
        }

        // Persist message first
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          text: text.trim(),
          attachments: attachments || [],
          readBy: [socket.user._id],
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date(),
        });

        const populatedMsg = await Message.findById(message._id).populate('senderId', 'name email avatarUrl');

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', populatedMsg);

        // Also notify workspace room about active conversation
        io.to(`workspace:${conv.workspaceId}`).emit('conversation:updated', {
          conversationId,
          lastMessage: populatedMsg,
        });
      } catch (err) {
        console.error('Socket message error:', err);
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        name: socket.user.name,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        name: socket.user.name,
        isTyping: false,
      });
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  return io;
};

const getIo = () => io;

module.exports = {
  initSocket,
  getIo,
};
