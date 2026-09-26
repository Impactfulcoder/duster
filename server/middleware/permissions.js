const requireAdmin = (req, res, next) => {
  if (!req.workspaceMember || req.workspaceMember.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required for this action.' });
  }
  next;
  next();
};

const requireMember = (req, res, next) => {
  if (!req.workspaceMember) {
    return res.status(403).json({ error: 'Workspace membership required.' });
  }
  next();
};

module.exports = {
  requireAdmin,
  requireMember,
};
