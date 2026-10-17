import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  BookOpen,
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { useLanguage } from '../../context/LanguageContext';
import { StudentListItem } from '../../types';

export const StudentListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [academicYear, setAcademicYear] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch metadata for filter dropdowns
  const { data: metadata } = useQuery({
    queryKey: ['settings-metadata'],
    queryFn: async () => {
      const res = await api.get('/settings/metadata');
      return res.data;
    },
  });

  // Fetch students with active filters
  const { data, isLoading } = useQuery({
    queryKey: ['students-list', page, search, academicYear, category, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        academicYear,
        category,
        status,
      });
      const res = await api.get(`/students?${params.toString()}`);
      return res.data;
    },
  });

  const students: StudentListItem[] = data?.students || [];
  const pagination = data?.pagination || { page: 1, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
              {t('studentsTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('studentsSubtitle')}
          </p>
        </div>
        <Link
          to="/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#172B4D] hover:bg-[#203650] text-white font-bold rounded-lg text-xs tracking-wide transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addStudent')}</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm space-y-3 transition-colors duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Academic Year Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t('academicStage')}
            </label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs font-medium text-slate-700 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">{t('filterByStage')}</option>
              {metadata?.academicStages.map((stage: any) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown (GC / Non-GC) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t('gcStatus')}
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs font-medium text-slate-700 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">{language === 'am' ? 'ሁሉም ምድቦች' : 'All Categories'}</option>
              {metadata?.gcClassifications.map((gc: any) => (
                <option key={gc.id} value={gc.id}>
                  {gc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t('participation')}
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs font-medium text-slate-700 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">{t('filterByStatus')}</option>
              <option value="ACTIVE">{t('active')}</option>
              <option value="INACTIVE">{t('inactive')}</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t('search')}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('searchStudentsPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-xs text-slate-700 dark:text-[#F4F0E7] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#29384E] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-[#121A28]/60">
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">{t('studentName')}</th>
                <th className="px-4 py-3.5">{t('phone')}</th>
                <th className="px-4 py-3.5">{t('academicStage')}</th>
                <th className="px-4 py-3.5">{t('gcStatus')}</th>
                <th className="px-4 py-3.5">{t('department')}</th>
                <th className="px-4 py-3.5">{t('family')}</th>
                <th className="px-4 py-3.5 text-center">{t('status')}</th>
                <th className="px-5 py-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29384E] text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/70 dark:hover:bg-[#202C3D] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {student.universityStudentId || `ST-${String(student.studentId).padStart(3, '0')}`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#172B4D]/10 dark:bg-[#121A28] text-[#172B4D] dark:text-blue-400 font-semibold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-[#29384E]">
                          {student.fullName[0].toUpperCase()}
                        </div>
                        <Link
                          to={`/students/${student.studentId}`}
                          className="font-semibold text-slate-800 dark:text-[#F4F0E7] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {student.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {student.phone}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {student.yearNumber === 0
                        ? (language === 'am' ? 'ሬሜዲያል' : 'Remedial')
                        : student.stageName?.replace(/\s*\(.*?\)\s*/g, '') || '-'}
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {student.gcClassificationName?.includes('Non-GC')
                        ? 'Non-GC'
                        : student.gcClassificationName?.includes('GC')
                        ? 'GC'
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate" title={student.departmentName || ''}>
                      {student.departmentName || '-'}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {student.familyName ? (
                        <Link
                          to={`/families/${student.familyId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {student.familyName}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">{t('unassigned')}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge status={student.participationStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/students/${student.studentId}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#202C3D] rounded-lg transition-colors"
                          title={t('details')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/students/${student.studentId}/edit`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202C3D] rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {t('noStudentsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-slate-100 dark:border-[#29384E] gap-3 bg-slate-50/30 dark:bg-[#121A28]/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('showingRecords')} {students.length > 0 ? (page - 1) * limit + 1 : 0}-
            {Math.min(page * limit, pagination.total)} {t('ofRecords')} {pagination.total} {language === 'am' ? 'ተማሪዎች' : 'students'}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#29384E] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202C3D] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(pagination.totalPages, page + 2))
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    p === page
                      ? 'bg-[#172B4D] text-white font-bold'
                      : 'border border-slate-200 dark:border-[#29384E] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202C3D]'
                  }`}
                >
                  {p}
                </button>
              ))}

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#29384E] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202C3D] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
