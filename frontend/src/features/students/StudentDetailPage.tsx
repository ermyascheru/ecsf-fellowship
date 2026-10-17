import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  GraduationCap,
  Home,
  Phone,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Clock,
  Edit,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Badge } from '../../components/common/Badge.js';
import { StudentDetail } from '../../types/index.js';
import { useLanguage } from '../../context/LanguageContext.js';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [toggleLoading, setToggleLoading] = useState(false);
  const { t, language } = useLanguage();

  const { data, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['student-detail', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data;
    },
  });

  const toggleParticipation = async () => {
    if (!data) return;
    setToggleLoading(true);
    const newStatus = data.student.participationStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/students/${id}/participation`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['student-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      console.error('Failed to update participation status:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-[#1A2536] p-8 rounded-xl border border-slate-200 dark:border-[#29384E] text-center">
        <p className="text-rose-600 dark:text-rose-400 font-semibold mb-2">
          {language === 'am' ? 'ተማሪው አልተገኘም' : 'Student not found'}
        </p>
        <Link to="/students" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          &larr; {t('backToStudents')}
        </Link>
      </div>
    );
  }

  const { student, activeAssignments, assignmentHistory, transferHistory } = data;

  return (
    <div className="space-y-6">
      {/* Back button & Actions header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToStudents')}</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleParticipation}
            disabled={toggleLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              student.participationStatus === 'ACTIVE'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            {student.participationStatus === 'ACTIVE' ? (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>{t('markInactive')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('markActive')}</span>
              </>
            )}
          </button>

          <Link
            to={`/students/${student.studentId}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#1A2536] border border-slate-200 dark:border-[#29384E] hover:bg-slate-50 dark:hover:bg-[#223045] text-slate-700 dark:text-[#F4F0E7] rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>{t('editStudent')}</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-2xl flex items-center justify-center border-2 border-blue-100 dark:border-blue-900/50">
              {student.fullName[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
                  {student.fullName}
                </h1>
                <Badge variant={student.participationStatus === 'ACTIVE' ? 'active' : 'inactive'}>
                  {student.participationStatus === 'ACTIVE' ? (language === 'am' ? 'ንቁ አባል' : 'Active Member') : t('inactive')}
                </Badge>
                {student.gcClassificationName?.includes('GC') && !student.gcClassificationName?.includes('Non-GC') && (
                  <Badge variant="info">
                    {language === 'am' ? 'ተመራቂ (GC)' : 'Graduating Class (GC)'}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                ID: {student.universityStudentId || (language === 'am' ? 'መታወቂያ የለም' : 'No University ID')} • {t('gender')}: {student.gender === 'MALE' ? t('male') : t('female')}
              </p>
            </div>
          </div>

          {/* Active Family Summary Pill */}
          <div className="p-3 bg-slate-50 dark:bg-[#121A28] rounded-lg border border-slate-100 dark:border-[#29384E] text-xs">
            <span className="text-slate-400 dark:text-slate-400 block mb-0.5">{t('family')}</span>
            {activeAssignments.length > 0 ? (
              activeAssignments.map((a) => (
                <div key={a.assignmentId} className="font-semibold text-slate-800 dark:text-[#F4F0E7] flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <Link to={`/families/${a.familyId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {a.familyName} ({a.role})
                  </Link>
                </div>
              ))
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-medium">{language === 'am' ? 'የተመደበበት ቤተሰብ የለም' : 'No active family'}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Profile */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F4F0E7] border-b border-slate-100 dark:border-[#29384E] pb-3 mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('academicDetails')}</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{t('department')}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">{student.departmentName || (language === 'am' ? 'ያልተመደበ' : 'Not Assigned')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{t('academicStage')}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">
                {student.yearNumber === 0 ? (language === 'am' ? 'ሬሜዲያል (0 ዓመት)' : 'Remedial (0 Year)') : student.stageName || (language === 'am' ? 'ያልተመደበ' : 'Not Assigned')}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{t('gcStatus')}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">{student.gcClassificationName || (language === 'am' ? 'ያልተመደበ' : 'Not Assigned')}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">{t('enrollmentDate')}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">{student.enrollmentDate || '-'}</span>
            </div>
          </div>
        </div>

        {/* Contact & Fellowship Info */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F4F0E7] border-b border-slate-100 dark:border-[#29384E] pb-3 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('personalDetails')}</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{t('phone')}</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-[#F4F0E7]">{student.phone}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{t('email')}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">{student.email || (language === 'am' ? 'አልተሰጠም' : 'Not Provided')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-[#29384E]/50">
              <span className="text-slate-500 dark:text-slate-400">{language === 'am' ? 'የተሳትፎ ለውጥ ቀን' : 'Participation Updated'}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">
                {new Date(student.participationUpdatedAt).toLocaleDateString()} {language === 'am' ? 'በ' : 'by'} {student.participationUpdatedByName || 'System'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">{language === 'am' ? 'በስርዓቱ የተመዘገበበት' : 'Registered In System'}</span>
              <span className="font-semibold text-slate-800 dark:text-[#F4F0E7]">{new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Family Assignments Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E] flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('studentHistory')}</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-400">{language === 'am' ? 'ያለፉ ምደባዎች መዝገብ' : 'Past tenures preserved'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                <th className="px-6 py-3">{t('familyName')}</th>
                <th className="px-4 py-3">{t('systemRole')}</th>
                <th className="px-4 py-3">{language === 'am' ? 'የጀመረበት ቀን' : 'Start Date'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'የአበቃበት ቀን' : 'End Date'}</th>
                <th className="px-6 py-3">{language === 'am' ? 'የማብቂያ ምክንያት' : 'End Reason'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
              {assignmentHistory.length > 0 ? (
                assignmentHistory.map((h) => (
                  <tr key={h.assignmentId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-[#F4F0E7]">{h.familyName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.role}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{h.startDate}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{h.endDate}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{h.endReason || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    {language === 'am' ? 'ለዚህ ተማሪ ምንም ያለፈ የቤተሰብ ምደባ ታሪክ የለም።' : 'No prior historical assignments for this student.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Transfers Log */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E] flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{language === 'am' ? 'የዝውውር ጥያቄዎች ታሪክ' : 'Transfer Request History'}</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-400">{transferHistory.length} {language === 'am' ? 'ጥያቄዎች' : 'requests'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                <th className="px-6 py-3">{t('originFamily')}</th>
                <th className="px-4 py-3">{t('destinationFamily')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('transferReason')}</th>
                <th className="px-4 py-3">{t('requestedBy')}</th>
                <th className="px-6 py-3">{t('decisionNote')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
              {transferHistory.length > 0 ? (
                transferHistory.map((tr) => (
                  <tr key={tr.transferId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 font-medium">{tr.fromFamilyName || t('unassigned')}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">{tr.toFamilyName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tr.status === 'APPROVED' ? 'active' : tr.status === 'REJECTED' ? 'danger' : 'at-capacity'}>
                        {tr.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={tr.reason}>{tr.reason}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{tr.requestedByName}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{tr.decisionNote || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                    {language === 'am' ? 'ለዚህ ተማሪ ምንም የተመዘገበ የዝውውር ጥያቄ የለም።' : 'No transfer requests on record for this student.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
