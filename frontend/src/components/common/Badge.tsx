import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export type BadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'active'
  | 'inactive'
  | 'over-capacity'
  | 'at-capacity'
  | 'on-track'
  | 'below-target';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  status?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  className = '',
  size = 'md',
}) => {
  const { t, language } = useLanguage();
  let resolvedVariant: BadgeVariant = variant || 'neutral';
  let label = children;

  if (status) {
    const s = status.toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'ACTIVE':
        resolvedVariant = 'active';
        label = label || t('active');
        break;
      case 'APPROVED':
        resolvedVariant = 'active';
        label = label || t('approved');
        break;
      case 'ON_TRACK':
        resolvedVariant = 'active';
        label = label || t('onTrack');
        break;
      case 'INACTIVE':
        resolvedVariant = 'inactive';
        label = label || t('inactive');
        break;
      case 'CANCELLED':
        resolvedVariant = 'inactive';
        label = label || t('cancelled');
        break;
      case 'PENDING':
        resolvedVariant = 'at-capacity';
        label = label || t('pending');
        break;
      case 'AT_CAPACITY':
        resolvedVariant = 'at-capacity';
        label = label || t('atCapacity');
        break;
      case 'OVER_CAPACITY':
        resolvedVariant = 'over-capacity';
        label = label || t('overCapacity');
        break;
      case 'REJECTED':
        resolvedVariant = 'over-capacity';
        label = label || t('rejected');
        break;
      case 'BELOW_TARGET':
        resolvedVariant = 'below-target';
        label = label || t('belowTarget');
        break;
      default:
        resolvedVariant = 'neutral';
        label = label || status;
        break;
    }
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#121A28] dark:text-slate-300 dark:border-[#29384E]';

  switch (resolvedVariant) {
    case 'success':
    case 'active':
    case 'on-track':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
      break;
    case 'danger':
    case 'over-capacity':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 font-medium';
      break;
    case 'warning':
    case 'at-capacity':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 font-medium';
      break;
    case 'below-target':
      colorClasses = 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/60';
      break;
    case 'info':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60';
      break;
    case 'inactive':
    case 'neutral':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#121A28] dark:text-slate-400 dark:border-[#29384E]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
