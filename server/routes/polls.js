const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
const ActivityEvent = require('../models/ActivityEvent');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { getIo } = require('../socket/socket');

// Helper to format poll with vote tallies
const formatPollDetails = async (poll, currentUserId) => {
  const votes = await PollVote.find({ pollId: poll._id });
  const totalVotes = votes.length;

  const optionCounts = {};
  poll.options.forEach((opt) => {
    optionCounts[opt.id] = 0;
  });

  votes.forEach((v) => {
    v.optionIds.forEach((optId) => {
      if (optionCounts[optId] !== undefined) {
        optionCounts[optId] += 1;
      }
    });
  });

  const myVote = votes.find((v) => v.userId.toString() === currentUserId.toString());

  return {
    id: poll._id,
    question: poll.question,
    options: poll.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      votes: optionCounts[opt.id] || 0,
      percentage: totalVotes > 0 ? Math.round(((optionCounts[opt.id] || 0) / totalVotes) * 100) : 0,
    })),
    type: poll.type,
    anonymous: poll.anonymous,
    status: poll.status,
    createdBy: poll.createdBy,
    closesAt: poll.closesAt,
    totalVotes,
    hasVoted: Boolean(myVote),
    myOptionIds: myVote ? myVote.optionIds : [],
    createdAt: poll.createdAt,
  };
};

// GET /api/polls — List polls
router.get('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { workspaceId: req.workspace._id };
    if (status && ['active', 'closed'].includes(status)) {
      query.status = status;
    }

    const polls = await Poll.find(query)
      .populate('createdBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    const results = await Promise.all(polls.map((p) => formatPollDetails(p, req.user._id)));
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/polls — Create poll
router.post('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { question, options, type = 'single', anonymous = false, closesAt } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Poll question is required.' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Poll must have at least 2 options.' });
    }

    const formattedOptions = options.map((opt, idx) => ({
      id: typeof opt === 'object' && opt.id ? opt.id : `opt_${idx + 1}`,
      label: (typeof opt === 'object' ? opt.label : opt).trim(),
    }));

    const poll = await Poll.create({
      workspaceId: req.workspace._id,
      question: question.trim(),
      options: formattedOptions,
      type: type === 'multiple' ? 'multiple' : 'single',
      anonymous: Boolean(anonymous),
      status: 'active',
      createdBy: req.user._id,
      closesAt: closesAt ? new Date(closesAt) : null,
    });

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'poll_created',
      entityType: 'poll',
      entityId: poll._id,
      title: `created poll "${poll.question}"`,
    });

    const formatted = await formatPollDetails(poll, req.user._id);

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('poll:new', formatted);
    }

    res.status(201).json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /api/polls/:id/vote — Vote
router.post('/:id/vote', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { optionIds } = req.body;
    const poll = await Poll.findOne({ _id: req.params.id, workspaceId: req.workspace._id });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ error: 'This poll is closed.' });
    }

    if (!optionIds || !optionIds.length) {
      return res.status(400).json({ error: 'At least one option selection required.' });
    }

    const validOptionIds = poll.options.map((o) => o.id);
    const selected = Array.isArray(optionIds) ? optionIds : [optionIds];

    const invalid = selected.some((id) => !validOptionIds.includes(id));
    if (invalid) {
      return res.status(400).json({ error: 'Invalid option selected.' });
    }

    if (poll.type === 'single' && selected.length > 1) {
      return res.status(400).json({ error: 'Single choice poll allows only 1 selection.' });
    }

    // Upsert vote
    await PollVote.findOneAndUpdate(
      { pollId: poll._id, userId: req.user._id },
      { optionIds: selected },
      { upsert: true, new: true }
    );

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'poll_voted',
      entityType: 'poll',
      entityId: poll._id,
      title: `voted in poll "${poll.question}"`,
    });

    const updatedDetails = await formatPollDetails(poll, req.user._id);

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('poll:update', updatedDetails);
    }

    res.json(updatedDetails);
  } catch (err) {
    next(err);
  }
});

// POST /api/polls/:id/close — Close poll
router.post('/:id/close', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    const isCreator = poll.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.workspaceMember.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Only the creator or workspace admin can close this poll.' });
    }

    poll.status = 'closed';
    await poll.save();

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'poll_closed',
      entityType: 'poll',
      entityId: poll._id,
      title: `closed poll "${poll.question}"`,
    });

    const formatted = await formatPollDetails(poll, req.user._id);

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('poll:update', formatted);
    }

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/polls/:id — Delete poll
router.delete('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    const isCreator = poll.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.workspaceMember.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this poll.' });
    }

    await Poll.deleteOne({ _id: poll._id });
    await PollVote.deleteMany({ pollId: poll._id });

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('poll:deleted', { pollId: poll._id });
    }

    res.json({ message: 'Poll deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
