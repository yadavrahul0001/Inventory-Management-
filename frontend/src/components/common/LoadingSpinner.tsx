import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-primary-200 border-t-primary-600 rounded-full animate-spin`}
      />
      {label && <p className="mt-3 text-sm text-gray-500 font-medium">{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
