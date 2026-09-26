import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusPill from '../../components/common/StatusPill';
import TaskModal from '../../components/common/TaskModal';
import { triggerConfetti } from '../../components/common/Celebration';

const COLUMNS = [
  { id: 'not_started', label: 'not started', icon: '○' },
  { id: 'in_progress', label: 'in progress', icon: '⏱' },
  { id: 'completed', label: 'completed', icon: '✔' },
  { id: 'blocked', label: 'blocked', icon: '⊗' },
  { id: 'on_hold', label: 'on hold', icon: '⏸' },
];

const Tasks = () => {
  const { activeWorkspace } = useWorkspace();
  const outletCtx = useOutletContext();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('board'); // 'board' | 'table' | 'calendar' | 'timeline' | 'list'
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState('not_started');

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const data = await request('/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchTasks();
    const handleRefresh = () => fetchTasks();
    window.addEventListener('duster:refresh-tasks', handleRefresh);
    return () => window.removeEventListener('duster:refresh-tasks', handleRefresh);
  }, [fetchTasks]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const updated = await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'completed') {
        triggerConfetti();
        if (outletCtx?.showCelebration) {
          outletCtx.showCelebration('Shipped ✦ nice work');
        }
      }

      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      const updated = await request(`/tasks/${editingTask._id}`, {
        method: 'PATCH',
        body: JSON.stringify(taskData),
      });
      setTasks((prev) => prev.map((t) => (t._id === editingTask._id ? updated : t)));
    } else {
      const created = await request('/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...taskData, status: taskData.status || defaultStatusForNew }),
      });
      setTasks((prev) => [created, ...prev]);
    }
    setEditingTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedPriority !== 'all' && (t.priority || '').toLowerCase() !== selectedPriority) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    return true;
  });

  /* -------------------------------------------------------------
     RENDER BOARD VIEW
  ------------------------------------------------------------- */
  const renderBoardView = () => {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
          gap: 14,
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: 24,
        }}
      >
        {COLUMNS.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.id);
          const isCompletedCol = col.id === 'completed';
          const isBlockedCol = col.id === 'blocked';

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 480,
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: isCompletedCol ? 'var(--success)' : isBlockedCol ? 'var(--danger)' : 'var(--text)',
                    }}
                  >
                    {col.icon} {col.label}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-card)',
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>
                      {task.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PriorityBadge priority={task.priority} />
                        {task.endDate && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(task.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      {task.tags && task.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {task.tags.slice(0, 2).map((tg) => (
                            <span
                              key={tg}
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10.5,
                                color: 'var(--text-muted)',
                              }}
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Task Button at bottom of column */}
              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    setDefaultStatusForNew(col.id);
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 0',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={12} />
                  <span>[ + add ]</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* -------------------------------------------------------------
     RENDER TABLE VIEW
  ------------------------------------------------------------- */
  const renderTableView = () => {
    return (
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--surface-hover)' }}>
              <th style={{ padding: '10px 14px' }}>TASK</th>
              <th style={{ padding: '10px 14px' }}>STATUS</th>
              <th style={{ padding: '10px 14px' }}>PRIORITY</th>
              <th style={{ padding: '10px 14px' }}>ASSIGNEE</th>
              <th style={{ padding: '10px 14px' }}>DUE DATE</th>
              <th style={{ padding: '10px 14px' }}>TAGS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((t) => (
              <tr
                key={t._id}
                onClick={() => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 500 }}>
                  {t.title}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <StatusPill status={t.status} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {t.assigneeId?.name || 'Unassigned'}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {t.endDate ? new Date(t.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {t.tags?.join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* -------------------------------------------------------------
     RENDER CALENDAR VIEW
  ------------------------------------------------------------- */
  const renderCalendarView = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const dayHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)
    const startOffset = (firstDay + 6) % 7;

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      const dayTasks = tasks.filter((t) => {
        if (!t.endDate) return false;
        return new Date(t.endDate).toISOString().slice(0, 10) === dateStr;
      });
      cells.push({ day: d, dateStr, tasks: dayTasks });
    }

    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const toToday = () => setCalendarDate(new Date());

    const isCurrentDay = (d) => {
      const now = new Date();
      return now.getDate() === d && now.getMonth() === month && now.getFullYear() === year;
    };

    return (
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 16 }}>
        {/* Month controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} className="btn-command" style={{ padding: '4px 8px' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700 }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="btn-command" style={{ padding: '4px 8px' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={toToday} className="btn-command">
            [ today ]
          </button>
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, backgroundColor: 'var(--border)' }}>
          {dayHeaders.map((dh) => (
            <div
              key={dh}
              style={{
                backgroundColor: 'var(--surface-hover)',
                padding: '8px 10px',
                textAlign: 'left',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {dh}
            </div>
          ))}

          {cells.map((cell, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg)',
                minHeight: 90,
                padding: '6px 8px',
                border: isCurrentDay(cell.day) ? '1px solid var(--accent)' : 'none',
              }}
            >
              {cell.day && (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: isCurrentDay(cell.day) ? 700 : 400,
                      color: isCurrentDay(cell.day) ? 'var(--accent)' : 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    {cell.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {cell.tasks?.slice(0, 3).map((t) => (
                      <div
                        key={t._id}
                        onClick={() => {
                          setEditingTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        style={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 2,
                          padding: '2px 5px',
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                          color: t.priority === 'p0' ? 'var(--danger)' : 'var(--text)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------
     RENDER TIMELINE VIEW
  ------------------------------------------------------------- */
  const renderTimelineView = () => {
    return (
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTasks.map((t) => {
            const hasDates = t.startDate || t.endDate;
            return (
              <div
                key={t._id}
                onClick={() => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {t.title}
                  </span>
                  <PriorityBadge priority={t.priority} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {hasDates ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        backgroundColor: 'var(--surface-hover)',
                        padding: '3px 8px',
                        borderRadius: 3,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}{' '}
                      →{' '}
                      {t.endDate ? new Date(t.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
                      no dates
                    </span>
                  )}
                  <StatusPill status={t.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* -------------------------------------------------------------
     RENDER LIST VIEW
  ------------------------------------------------------------- */
  const renderListView = () => {
    return (
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '8px 0' }}>
        {filteredTasks.map((t) => {
          const isDone = t.status === 'completed';
          return (
            <div
              key={t._id}
              onClick={() => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(t._id, isDone ? 'not_started' : 'completed');
                  }}
                  style={{ color: isDone ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: isDone ? 'var(--text-muted)' : 'var(--text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontWeight: 500,
                  }}
                >
                  {t.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <PriorityBadge priority={t.priority} />
                {t.endDate && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(t.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="terminal-comment">{"// workboard"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
            tasks
          </h1>
        </div>

        {/* View Switcher Tabs & New Task */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-btn)',
              padding: 2,
            }}
          >
            {[
              { id: 'board', label: "'| board" },
              { id: 'table', label: '⊞ table' },
              { id: 'calendar', label: '📅 calendar' },
              { id: 'timeline', label: '▤ timeline' },
              { id: 'list', label: '≡ list' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderRadius: 2,
                  color: activeView === v.id ? 'var(--accent)' : 'var(--text-muted)',
                  backgroundColor: activeView === v.id ? 'var(--surface-active)' : 'transparent',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            className="btn-command"
            onClick={() => {
              setEditingTask(null);
              setDefaultStatusForNew('not_started');
              setIsTaskModalOpen(true);
            }}
          >
            [ + new task ]
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Priority filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>priority •</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{ padding: '3px 8px', fontSize: 11.5 }}
            >
              <option value="all">all</option>
              <option value="p0">p0 (critical)</option>
              <option value="p1">p1 (high)</option>
              <option value="p2">p2 (medium)</option>
              <option value="p3">p3 (low)</option>
              <option value="p4">p4 (trivial)</option>
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>status •</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '3px 8px', fontSize: 11.5 }}
            >
              <option value="all">all</option>
              <option value="not_started">not started</option>
              <option value="in_progress">in progress</option>
              <option value="completed">completed</option>
              <option value="blocked">blocked</option>
              <option value="on_hold">on hold</option>
            </select>
          </div>
        </div>

        <div style={{ color: 'var(--text-muted)' }}>
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </div>
      </div>

      {/* Active View Container */}
      {loading && !tasks.length ? (
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: 40 }}>
          [ loading tasks... ]
        </div>
      ) : activeView === 'board' ? (
        renderBoardView()
      ) : activeView === 'table' ? (
        renderTableView()
      ) : activeView === 'calendar' ? (
        renderCalendarView()
      ) : activeView === 'timeline' ? (
        renderTimelineView()
      ) : (
        renderListView()
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
};

export default Tasks;
