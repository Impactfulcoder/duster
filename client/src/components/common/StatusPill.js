import React from 'react';

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  on_hold: 'On Hold',
};

const StatusPill = ({ status, onClick }) => {
  const s = status || 'not_started';
  const label = STATUS_LABELS[s] || s;

  return (
    <span
      className={`status-pill ${s}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {label}
    </span>
  );
};

export default StatusPill;
