import React from 'react';
import { InventoryStatus, RiskLevel } from '../../types';

interface StatusBadgeProps {
  status: InventoryStatus | RiskLevel | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (val: string): { bg: string; text: string; dot: string } => {
    switch (val) {
      case 'Healthy':
      case 'LOW':
      case 'active':
      case 'received':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500',
        };

      case 'Low Stock':
      case 'MEDIUM':
      case 'pending':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          text: 'text-amber-700',
          dot: 'bg-amber-500',
        };

      case 'Reorder Recommended':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          text: 'text-blue-700',
          dot: 'bg-blue-500',
        };

      case 'Stock-out Risk':
      case 'HIGH':
        return {
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          text: 'text-orange-700',
          dot: 'bg-orange-500',
        };

      case 'Critical':
      case 'CRITICAL':
      case 'discontinued':
      case 'cancelled':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          text: 'text-rose-700',
          dot: 'bg-rose-500',
        };

      default:
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          text: 'text-gray-700',
          dot: 'bg-gray-400',
        };
    }
  };

  const style = getBadgeStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
