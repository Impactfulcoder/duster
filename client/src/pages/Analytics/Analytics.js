import React, { useState, useEffect, useCallback } from 'react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import TaskModal from '../../components/common/TaskModal';

const Analytics = () => {
  const { activeWorkspace } = useWorkspace();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const data = await request('/analytics/summary');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: 40 }}>
        [ loading analytics metrics... ]
      </div>
    );
  }

  const { atAGlance, statusBreakdown, priorityMix, completionTimeline, deadlines, focusAreas } = analytics || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="terminal-comment">{"// signals"}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
          analytics
        </h1>
      </div>

      {/* Top Banner Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 16 }}>
        {/* Open / Shipped Block */}
        <div className="terminal-card">
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ○ OPEN
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                {atAGlance?.openTasksCount || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ✔ SHIPPED
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>
                {atAGlance?.shippedCount || 0}
              </div>
            </div>
          </div>

          <div style={{ height: 4, backgroundColor: 'var(--border)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ width: `${atAGlance?.completionRate || 0}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {atAGlance?.completionRate || 0}% complete • {atAGlance?.shippedCount || 0}/{atAGlance?.totalTasks || 0}
            </span>
            <button className="btn-command" onClick={() => setIsTaskModalOpen(true)}>
              [ + new task ]
            </button>
          </div>
        </div>

        {/* At a Glance Block */}
        <div className="terminal-card">
          <div className="terminal-comment" style={{ marginBottom: 12 }}>at a glance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {atAGlance?.completionRate || 0}%
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>
                COMPLETION of all tasks
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {atAGlance?.shippedLast7Days || 0}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>
                SHIPPED last 7 days
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)' }}>
                {atAGlance?.overdueCount || 0}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>
                OVERDUE past due date
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {atAGlance?.dueSoonCount || 0}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>
                DUE SOON next 7 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Completion Over Time & Priority Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Completion Over Time */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>completion over time</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 20 }}>
            Tasks shipped per day • last 14 days
          </div>

          {/* SVG Line / Area Graph */}
          <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 10px' }}>
            {completionTimeline?.map((item) => {
              const maxCount = Math.max(...completionTimeline.map((i) => i.count), 4);
              const heightPct = (item.count / maxCount) * 100;
              return (
                <div
                  key={item.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    title={`${item.date}: ${item.count} done`}
                    style={{
                      width: '100%',
                      maxWidth: 16,
                      height: `${Math.max(6, heightPct)}%`,
                      backgroundColor: item.count > 0 ? 'var(--accent)' : 'var(--border)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)', marginTop: 6 }}>
                    {item.date.slice(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Mix Donut / Legend */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>priority mix</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 20 }}>
            Open + shipped, by priority
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 16 }}>
            {/* Visual Donut representation */}
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                background: 'conic-gradient(#ff493f 0% 15%, #e6ad4c 15% 35%, #72a7ff 35% 65%, #85858d 65% 85%, #52525b 85% 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface)',
                }}
              />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorityMix?.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }} />
                  <span style={{ color: 'var(--text)' }}>{p.label}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Status Breakdown, Deadlines, Focus Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Status Breakdown Bar Chart */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>status breakdown</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 20 }}>
            Everything on the board right now
          </div>

          <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            {statusBreakdown?.map((s) => {
              const maxVal = Math.max(...statusBreakdown.map((item) => item.value), 6);
              const barHeight = (s.value / maxVal) * 100;
              return (
                <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {s.value}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(6, barHeight)}%`,
                      backgroundColor: s.key === 'completed' ? 'var(--success)' : s.key === 'blocked' ? 'var(--danger)' : 'var(--surface-hover)',
                      borderRadius: 2,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-subtle)',
                      marginTop: 6,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {s.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deadlines */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>deadlines</div>

          <div style={{ marginBottom: 16 }}>
            <div className="terminal-comment">{`// overdue • ${deadlines?.overdue?.length || 0}`}</div>
            {deadlines?.overdue?.length ? (
              deadlines.overdue.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                  </span>
                  <span style={{ color: 'var(--danger)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {new Date(d.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                No overdue tasks
              </span>
            )}
          </div>

          <div>
            <div className="terminal-comment">{"// upcoming"}</div>
            {deadlines?.upcoming?.length ? (
              deadlines.upcoming.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.title}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {new Date(u.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                No upcoming deadlines
              </span>
            )}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="terminal-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>focus areas</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 16 }}>
            Where your tasks cluster, by tag
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {focusAreas?.map((fa) => (
              <div key={fa.tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fa.tag}
                </span>
                <div style={{ flex: 1, height: 6, backgroundColor: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, fa.count * 18)}%`, height: '100%', backgroundColor: 'var(--text)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
                  {fa.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={async (taskData) => {
          await request('/tasks', { method: 'POST', body: JSON.stringify(taskData) });
          fetchAnalytics();
        }}
      />
    </div>
  );
};

export default Analytics;
