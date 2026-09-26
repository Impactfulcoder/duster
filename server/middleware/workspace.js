const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

const requireWorkspace = async (req, res, next) => {
  try {
    const workspaceId =
      req.headers['x-workspace-id'] ||
      req.params.workspaceId ||
      req.params.id ||
      req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required in headers or parameters.' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const member = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: req.user._id,
    });

    if (!member) {
      return res.status(403).json({ error: 'You do not have access to this workspace.' });
    }

    req.workspace = workspace;
    req.workspaceMember = member;
    next();
  } catch (err) {
    console.error('Workspace middleware error:', err);
    return res.status(500).json({ error: 'Failed to verify workspace access.' });
  }
};

module.exports = requireWorkspace;
