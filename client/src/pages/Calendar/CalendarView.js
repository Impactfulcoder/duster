import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import TaskModal from '../../components/common/TaskModal';

const CalendarView = () => {
  const { activeWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const data = await request('/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks for calendar:', err);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const dayHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const toToday = () => setCurrentDate(new Date());

  const isToday = (d) => {
    const now = new Date();
    return now.getDate() === d && now.getMonth() === month && now.getFullYear() === year;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="terminal-comment">{"// schedule"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
            calendar
          </h1>
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

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={prevMonth} className="btn-command" style={{ padding: '4px 8px' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, backgroundColor: 'var(--border)' }}>
          {dayHeaders.map((dh) => (
            <div
              key={dh}
              style={{
                backgroundColor: 'var(--surface-hover)',
                padding: '10px 12px',
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
                minHeight: 110,
                padding: '8px 10px',
                border: isToday(cell.day) ? '1px solid var(--accent)' : 'none',
              }}
            >
              {cell.day && (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: isToday(cell.day) ? 700 : 400,
                      color: isToday(cell.day) ? 'var(--accent)' : 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {cell.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cell.tasks?.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        style={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 2,
                          padding: '3px 6px',
                          fontSize: 11,
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

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={async (taskData) => {
          if (selectedTask) {
            await request(`/tasks/${selectedTask._id}`, { method: 'PATCH', body: JSON.stringify(taskData) });
          } else {
            await request('/tasks', { method: 'POST', body: JSON.stringify(taskData) });
          }
          fetchTasks();
        }}
        task={selectedTask}
      />
    </div>
  );
};

export default CalendarView;
