import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  HeartHandshake,
  ArrowLeftRight,
  FileText,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();

  // "People" page removed from navigation per requirement while keeping functions intact
  const navigation = [
    { name: t('navDashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('navStudents'), href: '/students', icon: BookOpen }, // Biblically tailored: BookOpen (Scripture/Discipleship)
    { name: t('navFamilies'), href: '/families', icon: HeartHandshake }, // Biblically tailored: HeartHandshake (Fellowship Care)
    { name: t('navTransfers'), href: '/transfers', icon: ArrowLeftRight },
    { name: t('navReports'), href: '/reports', icon: FileText },
    { name: t('navSettings'), href: '/settings', icon: Settings },
    ...(isAdmin ? [{ name: t('navAccounts'), href: '/accounts', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="flex flex-col h-full bg-[#172B4D] dark:bg-[#0E1624] text-slate-200 w-64 select-none border-r border-[#263D5C] dark:border-[#1E293B] shadow-xl transition-colors duration-200">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#263D5C]/80 dark:border-[#1E293B] bg-[#12223D] dark:bg-[#0A101A]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 border border-white/30 shadow-md">
            <img src="/logo.png" alt="FTVTI ECSF" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-wide">
              {t('appName')}
            </h1>
            <p className="text-[10px] text-blue-200/80 font-medium tracking-wider uppercase">
              {t('appSubtitle')}
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${
                  isActive
                    ? 'bg-[#203650] dark:bg-[#1A2536] text-white shadow-md border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-[#1F3352]/70 dark:hover:bg-[#152030]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-blue-300" strokeWidth={1.75} />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User Status pill in Sidebar footer */}
      <div className="p-3.5 border-t border-[#263D5C]/80 dark:border-[#1E293B] bg-[#12223D] dark:bg-[#0A101A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#203650] dark:bg-[#1A2536] border border-blue-400/40 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.fullName || user?.username}
            </p>
            <p className="text-[10px] text-blue-200/80 truncate font-medium">
              {user?.role === 'ADMIN' ? t('adminRole') : t('leaderRole')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
