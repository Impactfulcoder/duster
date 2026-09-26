import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

const TaskModal = ({ isOpen, onClose, onSave, task = null }) => {
  const { members } = useWorkspace();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('p1');
  const [status, setStatus] = useState('not_started');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setPriority(task.priority || 'p1');
      setStatus(task.status || 'not_started');
      setStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : '');
      setEndDate(task.endDate ? new Date(task.endDate).toISOString().slice(0, 10) : '');
      setAssigneeId(task.assigneeId?._id || task.assigneeId || '');
      setTags(Array.isArray(task.tags) ? task.tags.join(', ') : '');
      setNotes(task.notes || '');
    } else {
      setTitle('');
      setPriority('p1');
      setStatus('not_started');
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setAssigneeId('');
      setTags('');
      setNotes('');
    }
    setError('');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        priority,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        assigneeId: assigneeId || null,
        tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="terminal-comment">{task ? '// edit task' : '// new task'}</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
              {task ? 'update task details' : 'what are you shipping?'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
            [error: {error}]
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Design the landing page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="p0">P0 (Critical)</option>
                <option value="p1">P1 (High)</option>
                <option value="p2">P2 (Medium)</option>
                <option value="p3">P3 (Low)</option>
                <option value="p4">P4 (Trivial)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">end date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">tags (comma separated)</label>
            <input
              type="text"
              placeholder="design, research, urgent"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">notes</label>
            <textarea
              rows={3}
              placeholder="Context, links, acceptance criteria..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-command" onClick={onClose} disabled={loading}>
              [ cancel ]
            </button>
            <button type="submit" className="btn-command accent" disabled={loading}>
              {loading ? '[ saving... ]' : task ? '[ save changes ]' : '[ create task ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
