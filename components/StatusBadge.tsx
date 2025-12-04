import React from 'react';
import { Milestone } from '../types';
import { MILESTONE_COLORS } from '../constants';

interface StatusBadgeProps {
  status: Milestone;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colorClass = MILESTONE_COLORS[status] || "bg-gray-100 text-gray-800";
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};