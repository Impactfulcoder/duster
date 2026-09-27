const test = require('node:test');
const assert = require('node:assert/strict');

const { buildWorkspaceContextSummary } = require('../services/aiAssistant');

test('buildWorkspaceContextSummary includes the workspace snapshot and priority details', () => {
  const summary = buildWorkspaceContextSummary({
    name: 'Launch',
    memberCount: 3,
    tasks: [
      { title: 'Ship landing page', status: 'in_progress', priority: 'p1', tags: ['marketing'] },
      { title: 'Fix login bug', status: 'completed', priority: 'p0', tags: ['backend'] },
      { title: 'Draft roadmap', status: 'not_started', priority: 'p2', tags: ['planning'] },
    ],
  });

  assert.match(summary, /Launch/i);
  assert.match(summary, /2 open/i);
  assert.match(summary, /1 completed/i);
  assert.match(summary, /in_progress/i);
  assert.match(summary, /p0|p1|p2/i);
});
