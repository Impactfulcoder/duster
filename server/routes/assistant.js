const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const WorkspaceMember = require('../models/WorkspaceMember');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { generateWorkspaceAssistantReply } = require('../services/aiAssistant');

router.post('/workspace-summary', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { prompt } = req.body || {};

    const tasks = await Task.find({
      workspaceId: req.workspace._id,
      isArchived: false,
    }).sort({ updatedAt: -1 });

    const memberCount = await WorkspaceMember.countDocuments({ workspaceId: req.workspace._id });

    const result = await generateWorkspaceAssistantReply({
      workspaceName: req.workspace.name,
      memberCount,
      tasks,
      userPrompt: prompt || 'Summarize the current workspace status and recommend the next best move.',
    });

    res.json({
      workspace: req.workspace.name,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
