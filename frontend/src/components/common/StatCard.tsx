import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  subtitle,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-5 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#172B4D] dark:hover:border-blue-400 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
