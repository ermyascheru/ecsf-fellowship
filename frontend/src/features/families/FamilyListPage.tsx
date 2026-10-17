import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  Plus,
  Search,
  Users,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { FamilyListItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const FamilyListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();

  const { data, isLoading } = useQuery<{ families: FamilyListItem[] }>({
    queryKey: ['families-list', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get(`/families?${params.toString()}`);
      return res.data;
    },
  });

  const families = data?.families || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
              {t('familiesTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('familiesSubtitle')}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/families/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#172B4D] hover:bg-[#203650] text-white font-bold rounded-lg text-xs tracking-wide transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addFamily')}</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchFamiliesPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs text-slate-700 dark:text-[#F4F0E7] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs font-medium text-slate-700 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">{language === 'am' ? 'ሁሉም የአቅም ሁኔታዎች' : 'All Capacity Status'}</option>
            <option value="BELOW_CAPACITY">{t('belowTarget')}</option>
            <option value="AT_CAPACITY">{t('atCapacity')}</option>
            <option value="OVER_CAPACITY">{t('overCapacity')}</option>
          </select>
        </div>
      </div>

      {/* Families Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span>{t('loading')}</span>
          </div>
        </div>
      ) : families.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {families.map((f) => {
            const percentFilled = f.memberCapacity > 0
              ? Math.min(100, Math.round((f.activeMembersCount / f.memberCapacity) * 100))
              : 0;

            return (
              <div
                key={f.familyId}
                className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm p-6 flex flex-col justify-between hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-slate-200 dark:border-[#29384E]">
                        <HeartHandshake className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-800 dark:text-[#F4F0E7] text-base leading-tight">
                          {f.familyName}
                        </h2>
                        <span className="text-xs font-mono text-slate-400">
                          {f.familyCode}
                        </span>
                      </div>
                    </div>
                    <Badge status={f.displayStatus} />
                  </div>

                  {/* Leadership Summary */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{t('leaders')}: </span>
                    {f.leadershipSummary || (language === 'am' ? 'ያልተመደበ' : 'None')}
                  </p>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">
                        {f.activeMembersCount} / {f.memberCapacity} {language === 'am' ? 'አባላት' : 'members'}
                      </span>
                      <span
                        className={
                          f.remainingSpaces < 0
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : f.remainingSpaces === 0
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {f.remainingSpaces < 0
                          ? `${Math.abs(f.remainingSpaces)} ${language === 'am' ? 'ከአቅም በላይ' : 'over'}`
                          : `${f.remainingSpaces} ${language === 'am' ? 'ክፍት' : 'available'}`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#121A28] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          f.capacityStatus === 'OVER_CAPACITY'
                            ? 'bg-rose-500'
                            : f.capacityStatus === 'AT_CAPACITY'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer link */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#29384E] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{f.totalActivePeopleCount} {language === 'am' ? 'አጠቃላይ ሰዎች' : 'total people'}</span>
                  </div>
                  <Link
                    to={`/families/${f.familyId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>{t('details')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A2536] p-12 text-center rounded-xl border border-slate-200 dark:border-[#29384E]">
          <p className="text-slate-400 text-sm">{language === 'am' ? 'ምንም ቤተሰብ አልተገኘም።' : 'No families found matching your search.'}</p>
        </div>
      )}
    </div>
  );
};
