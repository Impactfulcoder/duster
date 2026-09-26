const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');

// GET /api/analytics/summary — Full analytics dashboard payload
router.get('/summary', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const tasks = await Task.find({
      workspaceId: req.workspace._id,
      isArchived: false,
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const openTasks = tasks.filter((t) => t.status !== 'completed');

    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const sevenDaysFuture = new Date(now.getTime() + 7 * 86400000);

    const shippedLast7Days = completedTasks.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= sevenDaysAgo
    ).length;

    const overdueTasks = openTasks.filter(
      (t) => t.endDate && new Date(t.endDate) < now
    );

    const dueSoonTasks = openTasks.filter(
      (t) => t.endDate && new Date(t.endDate) >= now && new Date(t.endDate) <= sevenDaysFuture
    );

    // Status breakdown
    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      on_hold: 0,
    };
    tasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status] += 1;
      }
    });

    // Priority mix (p0 - p4)
    const priorityCounts = { p0: 0, p1: 0, p2: 0, p3: 0, p4: 0 };
    tasks.forEach((t) => {
      const p = (t.priority || 'p1').toLowerCase();
      if (priorityCounts[p] !== undefined) {
        priorityCounts[p] += 1;
      }
    });

    // Completion over time (last 14 days)
    const dailyShipped = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().slice(5, 10); // MM-DD
      dailyShipped[dateKey] = 0;
    }

    completedTasks.forEach((t) => {
      if (t.completedAt) {
        const dateKey = new Date(t.completedAt).toISOString().slice(5, 10);
        if (dailyShipped[dateKey] !== undefined) {
          dailyShipped[dateKey] += 1;
        }
      }
    });

    const completionTimeline = Object.entries(dailyShipped).map(([date, count]) => ({
      date,
      count,
    }));

    // Focus areas (tags)
    const tagCounts = {};
    tasks.forEach((t) => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          if (tag) {
            const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
          }
        });
      }
    });

    const focusAreas = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      atAGlance: {
        totalTasks,
        openTasksCount: openTasks.length,
        shippedCount: completedTasks.length,
        completionRate,
        shippedLast7Days,
        overdueCount: overdueTasks.length,
        dueSoonCount: dueSoonTasks.length,
      },
      statusBreakdown: [
        { label: 'Not Started', value: statusCounts.not_started, key: 'not_started' },
        { label: 'In Progress', value: statusCounts.in_progress, key: 'in_progress' },
        { label: 'Completed', value: statusCounts.completed, key: 'completed' },
        { label: 'Blocked', value: statusCounts.blocked, key: 'blocked' },
        { label: 'On Hold', value: statusCounts.on_hold, key: 'on_hold' },
      ],
      priorityMix: [
        { id: 'p0', label: 'P0', value: priorityCounts.p0, color: '#ff493f' },
        { id: 'p1', label: 'P1', value: priorityCounts.p1, color: '#e6ad4c' },
        { id: 'p2', label: 'P2', value: priorityCounts.p2, color: '#72a7ff' },
        { id: 'p3', label: 'P3', value: priorityCounts.p3, color: '#85858d' },
        { id: 'p4', label: 'P4', value: priorityCounts.p4, color: '#52525b' },
      ],
      completionTimeline,
      deadlines: {
        overdue: overdueTasks.slice(0, 5).map((t) => ({
          id: t._id,
          title: t.title,
          priority: t.priority,
          endDate: t.endDate,
        })),
        upcoming: dueSoonTasks.slice(0, 5).map((t) => ({
          id: t._id,
          title: t.title,
          priority: t.priority,
          endDate: t.endDate,
        })),
      },
      focusAreas,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
