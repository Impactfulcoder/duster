import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { request } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import PriorityBadge from '../../components/common/PriorityBadge';
import TaskModal from '../../components/common/TaskModal';
import { triggerConfetti } from '../../components/common/Celebration';

const Dashboard = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const outletCtx = useOutletContext();

  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const [tasksData, analyticsData] = await Promise.all([
        request('/tasks'),
        request('/analytics/summary'),
      ]);
      setTasks(tasksData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener('duster:refresh-tasks', handleRefresh);
    return () => window.removeEventListener('duster:refresh-tasks', handleRefresh);
  }, [fetchData]);

  const handleToggleComplete = async (task, e) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';

    try {
      await request(`/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'completed') {
        triggerConfetti();
        if (outletCtx?.showCelebration) {
          outletCtx.showCelebration('Shipped ✦ nice work');
        }
      }

      fetchData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleSaveTask = async (taskData) => {
    if (selectedTask) {
      await request(`/tasks/${selectedTask._id}`, {
        method: 'PATCH',
        body: JSON.stringify(taskData),
      });
    } else {
      await request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
    }
    fetchData();
  };

  // Helper date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const openTasks = tasks.filter((t) => t.status !== 'completed' && !t.isArchived);
  const completedTasks = tasks.filter((t) => t.status === 'completed' && !t.isArchived);
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' && !t.isArchived);
  const todayTasks = openTasks.slice(0, 6);

  const getGreeting = () => {
    const hours = now.getHours();
    if (hours < 12) return 'good morning';
    if (hours < 18) return 'good afternoon';
    return 'good evening';
  };

  if (loading && !tasks.length) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: 40 }}>
        [ loading dashboard... ]
      </div>
    );
  }

  const completionPct = analytics?.atAGlance?.completionRate || 0;

  return (
    <div>
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                backgroundColor: '#9a3412',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 2,
              }}
            >
              {activeWorkspace?.name?.slice(0, 2).toUpperCase() || 'WS'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {activeWorkspace?.name || 'My Workspace'}
            </span>
          </div>
          <div className="terminal-comment">{`// ${dateStr.toLowerCase()}`}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '8px 0 4px' }}>
            {getGreeting()}, {user?.name?.split(' ')[0].toLowerCase() || 'collaborator'}.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {openTasks.length} tasks on your plate today. One at a time.
          </p>
        </div>

        {/* Top-Right Stats Widget */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ○ OPEN
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {openTasks.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ✔ SHIPPED
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
                {completedTasks.length}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
            {completionPct}% complete • {completedTasks.length}/{tasks.length}
          </div>

          <button
            className="btn-command"
            onClick={() => {
              setSelectedTask(null);
              setIsTaskModalOpen(true);
            }}
          >
            [ + new task ]
          </button>
        </div>
      </div>

      {/* 3-Column Top Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        {/* Today Card */}
        <div className="terminal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>today</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {openTasks.length} open
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                No open tasks for today.
              </div>
            ) : (
              todayTasks.map((t) => (
                <div
                  key={t._id}
                  onClick={() => {
                    setSelectedTask(t);
                    setIsTaskModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: 'var(--surface-hover)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <button
                      onClick={(e) => handleToggleComplete(t, e)}
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      <Circle size={15} />
                    </button>
                    <span style={{ fontSize: 12.5, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Progress Card */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>weekly progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
            {/* Circular Rate Indicator */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '4px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRightColor: completionPct > 50 ? 'var(--accent)' : 'var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>{completionPct}%</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>complete</span>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {analytics?.atAGlance?.shippedLast7Days || 0} done in the last 7 days
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {analytics?.atAGlance?.overdueCount || 0} overdue
              </div>
            </div>
          </div>

          {/* Simple distribution bar */}
          <div style={{ width: '100%', height: 4, backgroundColor: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${completionPct}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
          </div>
        </div>

        {/* Deadlines Card */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>deadlines</div>

          <div style={{ marginBottom: 14 }}>
            <div className="terminal-comment">{"// overdue"}</div>
            {analytics?.deadlines?.overdue?.length ? (
              analytics.deadlines.overdue.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                  </span>
                  <PriorityBadge priority={d.priority} />
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                No overdue tasks
              </span>
            )}
          </div>

          <div>
            <div className="terminal-comment">{"// upcoming"}</div>
            {analytics?.deadlines?.upcoming?.length ? (
              analytics.deadlines.upcoming.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.title}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {new Date(u.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                No upcoming deadlines
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* In Progress Card */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>in progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inProgressTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                No tasks currently in progress.
              </div>
            ) : (
              inProgressTasks.slice(0, 5).map((t) => (
                <div
                  key={t._id}
                  onClick={() => {
                    setSelectedTask(t);
                    setIsTaskModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: 'var(--surface-hover)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 12.5, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Shipped Card */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>recently shipped</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completedTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                No shipped tasks yet.
              </div>
            ) : (
              completedTasks.slice(0, 5).map((t) => (
                <div
                  key={t._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {t.completedAt
                      ? new Date(t.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Focus Areas Card */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>focus areas</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
            Where your tasks cluster, by tag
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analytics?.focusAreas?.length ? (
              analytics.focusAreas.map((fa) => (
                <div key={fa.tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 80,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fa.tag}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      backgroundColor: 'var(--border)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, fa.count * 16)}%`,
                        height: '100%',
                        backgroundColor: 'var(--text)',
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
                    {fa.count}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                Add tags to tasks to see focus areas.
              </span>
            )}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        task={selectedTask}
      />
    </div>
  );
};

export default Dashboard;
