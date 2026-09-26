import React from 'react';

const PriorityBadge = ({ priority }) => {
  const p = (priority || 'p1').toLowerCase();
  return <span className={`badge-priority ${p}`}>{p}</span>;
};

export default PriorityBadge;
