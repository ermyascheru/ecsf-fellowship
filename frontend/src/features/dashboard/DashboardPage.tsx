import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  HeartHandshake,
  Award,
  ArrowRight,
  AlertTriangle,
  UserMinus,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { DashboardStats } from '../../types';

export const DashboardPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { isDark } = useTheme();

  // 1. Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
  });

  // 2. Fetch academic stages chart data
  const { data: chartData } = useQuery({
    queryKey: ['dashboard-academic-stages'],
    queryFn: async () => {
      const res = await api.get('/dashboard/academic-stages');
      return res.data;
    },
  });

  // 3. Fetch family overview
  const { data: familyOverview } = useQuery({
    queryKey: ['dashboard-family-overview'],
    queryFn: async () => {
      const res = await api.get('/dashboard/family-overview');
      return res.data.families;
    },
  });

  // Prepare chart series: include Remedial, 1st - 4th Years, and GC
  const barChartSeries = (chartData?.stages || []).map((s: any) => {
    let name = s.stageName.replace('Year', 'Yr').replace(' (0 Year)', '');
    if (language === 'am') {
      if (name.includes('Remedial')) name = 'ሬሜዲያል';
      else if (name.includes('First')) name = '1ኛ ዓመት';
      else if (name.includes('Second')) name = '2ኛ ዓመት';
      else if (name.includes('Third')) name = '3ኛ ዓመት';
      else if (name.includes('Fourth')) name = '4ኛ ዓመት';
    }
    return {
      name,
      count: s.total,
      isGc: false,
    };
  });

  if (chartData?.gcTotal !== undefined) {
    barChartSeries.push({
      name: language === 'am' ? 'ተመራቂ (GC)' : 'GC',
      count: chartData.gcTotal,
      isGc: true,
    });
  }

  return (
    <div className="space-y-6">
      {/* Scripture Welcome Banner */}
      <div className="bg-gradient-to-r from-[#172B4D] to-[#203650] dark:from-[#0E1624] dark:to-[#1A2536] text-white p-5 md:p-6 rounded-2xl shadow-md border border-[#263D5C]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200/90">
              {t('appName')} &bull; {t('ministry')}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            {t('dashboardTitle')}
          </h1>
          <p className="text-xs md:text-sm text-slate-200 mt-1 italic font-serif">
            {t('scriptureQuote')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/students/new"
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#172B4D] text-xs font-bold rounded-lg shadow-sm transition"
          >
            + {t('addStudent')}
          </Link>
          <Link
            to="/families/new"
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition"
          >
            + {t('addFamily')}
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards with Biblically Tailored Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('statTotalStudents')}
          value={statsLoading ? '...' : stats?.totalStudents ?? 0}
          subtitle={`${stats?.activePercentage ?? 0}% ${t('activeRate')}`}
          icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />}
          iconBgColor="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title={t('statTotalFamilies')}
          value={statsLoading ? '...' : stats?.totalFamilies ?? 0}
          subtitle={`${stats?.familiesAtCapacity ?? 0} ${t('atCapacity').toLowerCase()}`}
          icon={<HeartHandshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title={t('statGc')}
          value={statsLoading ? '...' : stats?.gcStudents ?? 0}
          icon={<Award className="w-5 h-5 text-[#172B4D] dark:text-blue-300" strokeWidth={1.75} />}
          iconBgColor="bg-slate-100 dark:bg-[#202C3D] text-[#172B4D]"
        />
        <StatCard
          title={t('statRemedial')}
          value={statsLoading ? '...' : stats?.remedialStudents ?? 0}
          icon={<BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />}
          iconBgColor="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Secondary Operational Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/transfers?status=PENDING"
          className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200/90 dark:border-[#29384E] hover:border-blue-500 dark:hover:border-blue-400 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-[#172B4D] group-hover:text-white transition-colors">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('statPendingTransfers')}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-[#F4F0E7]">
                {stats?.pendingTransfers ?? 0} {language === 'am' ? 'ጥያቄዎች' : 'requests'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link
          to="/reports/unassigned-students"
          className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200/90 dark:border-[#29384E] hover:border-blue-500 dark:hover:border-blue-400 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg group-hover:bg-[#172B4D] group-hover:text-white transition-colors">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('statUnassigned')}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-[#F4F0E7]">
                {stats?.unassignedStudents ?? 0} {language === 'am' ? 'ተማሪዎች' : 'students'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link
          to="/reports/family-capacity"
          className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200/90 dark:border-[#29384E] hover:border-rose-400 dark:hover:border-rose-400 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('statCapacityHealth')}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-[#F4F0E7]">
                {stats?.familiesAtCapacity ?? 0} {language === 'am' ? 'ቤተሰቦች' : 'families'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
        </Link>
      </div>

      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Family Overview Table */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E] flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-[#F4F0E7] text-base">
                {t('familyOverview')}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {stats?.totalFamilies ?? 0} {t('navFamilies')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#29384E] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-[#121A28]/50">
                    <th className="px-6 py-3">{t('family')}</th>
                    <th className="px-4 py-3 text-center">{t('navStudents')}</th>
                    <th className="px-4 py-3 text-center">{t('memberCapacity')}</th>
                    <th className="px-6 py-3 text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#29384E] text-sm">
                  {familyOverview && familyOverview.length > 0 ? (
                    familyOverview.slice(0, 6).map((fam: any) => (
                      <tr key={fam.familyId} className="hover:bg-slate-50/70 dark:hover:bg-[#202C3D] transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-[#F4F0E7]">
                          <Link to={`/families/${fam.familyId}`} className="hover:text-blue-600 transition-colors">
                            {fam.familyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-700 dark:text-slate-300 font-semibold">
                          {fam.students}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 dark:text-slate-400">
                          {fam.capacity}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Badge status={fam.displayStatus} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">
                        {language === 'am' ? 'ምንም የተመዘገበ ቤተሰብ የለም' : 'No families registered yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-[#29384E] bg-slate-50/40 dark:bg-[#121A28]/40">
            <Link
              to="/families"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
            >
              <span>{t('viewAll')} {t('navFamilies')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Students by Academic Stage Chart */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm p-6 flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 dark:text-[#F4F0E7] text-base">
                {t('academicStageDistribution')}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {language === 'am' ? 'የትምህርት እርከን' : 'Academic Progression'}
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: isDark ? '#29384E' : '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94A3B8' : '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#121A28' : '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #29384E' : 'none',
                      fontSize: '12px',
                    }}
                    cursor={{ fill: isDark ? '#202C3D' : '#F1F5F9' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {barChartSeries.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isGc ? '#172B4D' : index === 0 ? '#60A5FA' : '#2563EB'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-[#29384E] mt-2">
            <Link
              to="/reports/academic-stages"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
            >
              <span>{t('viewInteractiveReport')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
