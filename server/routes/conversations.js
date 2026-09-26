const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const WorkspaceMember = require('../models/WorkspaceMember');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { getIo } = require('../socket/socket');

// GET /api/conversations — List conversations for current user in active workspace
router.get('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      workspaceId: req.workspace._id,
      $or: [
        { type: 'workspace' },
        { type: 'direct', participantIds: req.user._id },
      ],
    })
      .populate('participantIds', 'name email avatarUrl')
      .sort({ lastMessageAt: -1 });

    const results = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversationId: conv._id })
          .populate('senderId', 'name')
          .sort({ createdAt: -1 });

        return {
          id: conv._id,
          type: conv.type,
          name: conv.name,
          participants: conv.participantIds,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text,
                senderName: lastMsg.senderId?.name,
                createdAt: lastMsg.createdAt,
              }
            : null,
          lastMessageAt: conv.lastMessageAt,
        };
      })
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/workspace-general — Get or create workspace group chat
router.get('/workspace-general', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    let conv = await Conversation.findOne({
      workspaceId: req.workspace._id,
      type: 'workspace',
    });

    if (!conv) {
      // Gather all current members
      const members = await WorkspaceMember.find({ workspaceId: req.workspace._id });
      conv = await Conversation.create({
        workspaceId: req.workspace._id,
        type: 'workspace',
        name: `${req.workspace.name} Chat`,
        participantIds: members.map((m) => m.userId),
      });
    }

    res.json({
      id: conv._id,
      type: conv.type,
      name: conv.name,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/direct — Start or get direct 1-to-1 conversation
router.post('/direct', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot start direct conversation with yourself.' });
    }

    // Verify target user is in workspace
    const targetMember = await WorkspaceMember.findOne({
      workspaceId: req.workspace._id,
      userId: targetUserId,
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'User is not a member of this workspace.' });
    }

    let conv = await Conversation.findOne({
      workspaceId: req.workspace._id,
      type: 'direct',
      participantIds: { $all: [req.user._id, targetUserId], $size: 2 },
    }).populate('participantIds', 'name email avatarUrl');

    if (!conv) {
      conv = await Conversation.create({
        workspaceId: req.workspace._id,
        type: 'direct',
        participantIds: [req.user._id, targetUserId],
      });
      conv = await Conversation.findById(conv._id).populate('participantIds', 'name email avatarUrl');
    }

    res.json({
      id: conv._id,
      type: conv.type,
      participants: conv.participantIds,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id/messages — Get message history
router.get('/:id/messages', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId: conv._id })
      .populate('senderId', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/messages — Send message via REST
router.post('/:id/messages', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { text, attachments } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const conv = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const message = await Message.create({
      conversationId: conv._id,
      senderId: req.user._id,
      text: text.trim(),
      attachments: attachments || [],
      readBy: [req.user._id],
    });

    conv.lastMessageAt = new Date();
    await conv.save();

    const populated = await Message.findById(message._id).populate('senderId', 'name email avatarUrl');

    const io = getIo();
    if (io) {
      io.to(`conversation:${conv._id}`).emit('message:new', populated);
      io.to(`workspace:${req.workspace._id}`).emit('conversation:updated', {
        conversationId: conv._id,
        lastMessage: populated,
      });
    }

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
