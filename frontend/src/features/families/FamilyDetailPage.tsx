import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Edit,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Badge, BadgeVariant } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { FamilyDetail } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';

export const FamilyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'leaders' | 'members' | 'students' | 'history'>('leaders');

  // Modal states for assigning member
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<'DAD' | 'MOM' | 'MEMBER'>('MEMBER');
  const [allowCapacityOverride, setAllowCapacityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Modal states for ending assignment
  const [endingAssignmentId, setEndingAssignmentId] = useState<number | null>(null);
  const [endReason, setEndReason] = useState('');

  const { data, isLoading, error } = useQuery<FamilyDetail>({
    queryKey: ['family-detail', id],
    queryFn: async () => {
      const res = await api.get(`/families/${id}`);
      return res.data;
    },
  });

  // Query unassigned people for assign dropdown
  const { data: peopleData } = useQuery({
    queryKey: ['people-unassigned'],
    queryFn: async () => {
      const res = await api.get('/people?limit=100');
      return res.data.people;
    },
    enabled: isAssignModalOpen,
  });

  const getBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'OVER_CAPACITY':
        return 'over-capacity';
      case 'AT_CAPACITY':
        return 'at-capacity';
      case 'BELOW_CAPACITY':
        return 'on-track';
      default:
        return 'neutral';
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    if (!selectedPersonId) {
      setAssignError(language === 'am' ? 'እባክዎ ግለሰብ ይምረጡ' : 'Please select an individual.');
      return;
    }

    try {
      await api.post(`/families/${id}/assign`, {
        personId: Number(selectedPersonId),
        role: selectedRole,
        allowCapacityOverride,
        overrideReason: allowCapacityOverride ? overrideReason : null,
      });

      queryClient.invalidateQueries({ queryKey: ['family-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['families-list'] });
      setIsAssignModalOpen(false);
      setSelectedPersonId('');
      setAllowCapacityOverride(false);
      setOverrideReason('');
    } catch (err: any) {
      setAssignError(err.response?.data?.error || (language === 'am' ? 'የቤተሰብ ሚናን መመደብ አልተቻለም' : 'Failed to assign family role.'));
    }
  };

  const handleEndAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endingAssignmentId || !endReason.trim()) return;

    try {
      await api.post(`/families/assignments/${endingAssignmentId}/end`, {
        endReason: endReason.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['family-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['families-list'] });
      setEndingAssignmentId(null);
      setEndReason('');
    } catch (err: any) {
      alert(err.response?.data?.error || (language === 'am' ? 'ምደባውን ማብቃት አልተቻለም' : 'Failed to end assignment.'));
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
          {language === 'am' ? 'ቤተሰቡ አልተገኘም' : 'Family not found'}
        </p>
        <Link to="/families" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          &larr; {t('backToFamilies')}
        </Link>
      </div>
    );
  }

  const { family, leaders, members, history } = data;
  const isOverCapacity = family.capacityStatus === 'OVER_CAPACITY';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/families"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToFamilies')}</span>
        </Link>
      </div>

      {/* Top Family Header */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
                {family.familyName}
              </h1>
              <Badge variant={getBadgeVariant(family.capacityStatus)}>
                {isOverCapacity
                  ? t('overCapacity')
                  : family.capacityStatus === 'AT_CAPACITY'
                  ? t('atCapacity')
                  : t('onTrack')}
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-400 mt-0.5">
              {t('familyCode')}: {family.familyCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('assignRole')}</span>
          </button>
          {isAdmin && (
            <Link
              to={`/families/${family.familyId}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] hover:bg-slate-50 dark:hover:bg-[#223045] text-slate-700 dark:text-[#F4F0E7] rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{t('editFamily')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3 Capacity Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Capacity Card */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
            {t('memberCapacity')}
          </p>
          <p className="text-3xl font-bold text-slate-800 dark:text-[#F4F0E7]">
            {family.memberCapacity}
          </p>
        </div>

        {/* Current Members Card */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
            {t('currentMembers')}
          </p>
          <p className="text-3xl font-bold text-slate-800 dark:text-[#F4F0E7]">
            {family.activeMemberCount}
          </p>
        </div>

        {/* Available Spots Card (Red if negative) */}
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
            {t('availableSpaces')}
          </p>
          <p
            className={`text-3xl font-bold ${
              family.remainingSpaces < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-[#F4F0E7]'
            }`}
          >
            {family.remainingSpaces}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-[#29384E] flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('leaders')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'leaders'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {t('leadersTab')} ({leaders.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'members'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {t('membersTab')} ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'students'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {language === 'am' ? 'ሁሉም ተማሪዎች' : 'All Students'} ({members.filter((m) => m.studentId).length + leaders.filter((l) => l.studentId).length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {t('historyTab')} ({history.length})
        </button>
      </div>

      {/* Tab 1: Leaders Section */}
      {activeTab === 'leaders' && (
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E] flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm">{language === 'am' ? 'የቤተሰብ መሪዎች (አባት እና እናት)' : 'Family Leaders (Dad & Mom)'}</h2>
            <span className="text-xs text-slate-400 dark:text-slate-400">{language === 'am' ? 'ከአባላት አቅም ገደብ አይቆጠሩም' : 'Do not consume member capacity'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                  <th className="px-6 py-3.5">{t('studentName')}</th>
                  <th className="px-4 py-3.5">{t('systemRole')}</th>
                  <th className="px-4 py-3.5">{t('phone')}</th>
                  <th className="px-4 py-3.5">{language === 'am' ? 'የጀመረበት ቀን' : 'Since'}</th>
                  <th className="px-6 py-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {leaders.length > 0 ? (
                  leaders.map((leader) => (
                    <tr key={leader.assignmentId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                      <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-[#F4F0E7]">
                        <Link to={`/people/${leader.personId}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold">
                          {leader.fullName}
                        </Link>
                        {leader.studentId && (
                          <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 font-medium">
                            {language === 'am' ? 'ተማሪ' : 'Student'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="info">{leader.role === 'DAD' ? t('dadRole') : leader.role === 'MOM' ? t('momRole') : leader.role}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">{leader.phone}</td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{leader.startDate}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setEndingAssignmentId(leader.assignmentId)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-800 font-medium text-xs"
                          title="Relieve Leader"
                        >
                          {t('endAssignment')}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      {language === 'am' ? 'በአሁኑ ሰዓት ለዚህ ቤተሰብ የተመደበ መሪ የለም።' : 'No leaders currently assigned to this family.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Family Members (Students and Others) */}
      {activeTab === 'members' && (
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E] flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm">{language === 'am' ? 'የቤተሰብ አባላት (ተማሪዎች እና ሌሎች)' : 'Family Members (Students and Others)'}</h2>
            <span className="text-xs text-slate-400 dark:text-slate-400">{members.length} {language === 'am' ? 'መደበኛ አባላት' : 'ordinary members'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                  <th className="px-6 py-3.5">{t('studentName')}</th>
                  <th className="px-4 py-3.5">{t('systemRole')}</th>
                  <th className="px-4 py-3.5">{t('phone')}</th>
                  <th className="px-4 py-3.5">{t('department')}</th>
                  <th className="px-4 py-3.5">{language === 'am' ? 'የጀመረበት ቀን' : 'Since'}</th>
                  <th className="px-6 py-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.assignmentId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                      <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-[#F4F0E7]">
                        {member.studentId ? (
                          <Link to={`/students/${member.studentId}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold">
                            {member.fullName}
                          </Link>
                        ) : (
                          <Link to={`/people/${member.personId}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold">
                            {member.fullName}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="neutral">{t('memberRole')}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">{member.phone}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{member.departmentName || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{member.startDate}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setEndingAssignmentId(member.assignmentId)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-800 font-medium text-xs"
                          title="End Membership"
                        >
                          {t('endAssignment')}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      {language === 'am' ? 'በዚህ ቤተሰብ ውስጥ የተመደበ መደበኛ አባል እስካሁን የለም።' : 'No ordinary members assigned to this family yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Students Roster */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E]">
            <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm">{language === 'am' ? 'በቤተሰቡ ውስጥ ያሉ ተማሪዎች የትምህርት መረጃ' : 'Academic Profiles in Family'}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                  <th className="px-6 py-3">{t('studentName')}</th>
                  <th className="px-4 py-3">{t('studentId')}</th>
                  <th className="px-4 py-3">{t('department')}</th>
                  <th className="px-4 py-3">{t('academicStage')}</th>
                  <th className="px-4 py-3">{t('gcStatus')}</th>
                  <th className="px-6 py-3 text-center">{t('participation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {members.map((m) => (
                  <tr key={m.assignmentId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-[#F4F0E7]">
                      <Link to={`/students/${m.studentId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {m.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{m.universityStudentId || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.departmentName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.academicYear === 0 ? (language === 'am' ? 'ሬሜዲያል' : 'Remedial') : m.academicStage || '-'}</td>
                    <td className="px-4 py-3">
                      {m.gcClassification?.includes('GC') && !m.gcClassification?.includes('Non-GC') ? (
                        <span className="text-blue-700 dark:text-blue-400 font-semibold">GC</span>
                      ) : (
                        <span className="text-slate-400">Non-GC</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={m.participationStatus === 'ACTIVE' ? 'active' : 'inactive'}>
                        {m.participationStatus === 'ACTIVE' ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Historical Assignments */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#29384E]">
            <h2 className="font-semibold text-slate-800 dark:text-[#F4F0E7] text-sm">{language === 'am' ? 'ያለፉ ምደባዎች እና የመሪዎች ታሪክ' : 'Past Assignments & Leadership History'}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-[#121A28]/60 text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-[#29384E]">
                  <th className="px-6 py-3">{t('studentName')}</th>
                  <th className="px-4 py-3">{t('systemRole')}</th>
                  <th className="px-4 py-3">{language === 'am' ? 'የጀመረበት ቀን' : 'Start Date'}</th>
                  <th className="px-4 py-3">{language === 'am' ? 'የአበቃበት ቀን' : 'End Date'}</th>
                  <th className="px-6 py-3">{language === 'am' ? 'የመልቀቂያ ምክንያት' : 'Reason for Departure'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {history.length > 0 ? (
                  history.map((h) => (
                    <tr key={h.assignmentId} className="hover:bg-slate-50/60 dark:hover:bg-[#223045]/60">
                      <td className="px-6 py-3 font-medium text-slate-800 dark:text-[#F4F0E7]">{h.fullName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.role}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{h.startDate}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{h.endDate}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{h.endReason || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      {language === 'am' ? 'እስካሁን የተመዘገበ የታሪክ መዝገብ የለም።' : 'No historical assignments recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Assign Person to Family */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`${language === 'am' ? 'አባል ወደ ' : 'Assign Person to '} ${family.familyName} ${language === 'am' ? 'መድብ' : ''}`}
        description={language === 'am' ? 'ግለሰብን ይምረጡ እና የመሪነት ወይም የመደበኛ አባልነት ሚና ይስጡ።' : 'Select an individual and assign them a leadership or ordinary member role.'}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {assignError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{assignError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'am' ? 'ግለሰብ ይምረጡ' : 'Select Person'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- {language === 'am' ? 'ግለሰብ ይምረጡ' : 'Choose individual'} --</option>
              {peopleData?.map((p: any) => (
                <option key={p.personId} value={p.personId}>
                  {p.fullName} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'am' ? 'የቤተሰብ ሚና' : 'Role in Family'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="MEMBER">{t('memberRole')} ({language === 'am' ? '1 የአቅም ቦታ ይይዛል' : 'Consumes 1 capacity space'})</option>
              <option value="DAD">{t('dadRole')} ({language === 'am' ? 'የቤተሰብ መሪ - የማይቆጠር' : 'Leadership - Uncounted'})</option>
              <option value="MOM">{t('momRole')} ({language === 'am' ? 'የቤተሰብ መሪ - የማይቆጠር' : 'Leadership - Uncounted'})</option>
            </select>
          </div>

          {/* Capacity warning & explicit override */}
          {selectedRole === 'MEMBER' && family.activeMemberCount >= family.memberCapacity && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  {language === 'am' ? `ይህ ቤተሰብ አቅሙ ሞልቷል (${family.activeMemberCount}/${family.memberCapacity})። ለማጽደቅ የአስተዳዳሪ ልዩ ማለፊያ ያስፈልጋል።` : `This family is at full capacity (${family.activeMemberCount}/${family.memberCapacity}). An explicit administrative override is required.`}
                </span>
              </div>

              {isAdmin ? (
                <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCapacityOverride}
                      onChange={(e) => setAllowCapacityOverride(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{t('allowOverride')}</span>
                  </label>

                  {allowCapacityOverride && (
                    <input
                      type="text"
                      placeholder={language === 'am' ? 'የአቅም ማለፊያ ምክንያቱን ይጻፉ...' : 'Enter justification / reason for override...'}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      required={allowCapacityOverride}
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#121A28] border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {language === 'am' ? 'የአቅም ማለፊያ መፍቀድ የሚችሉት አስተዳዳሪዎች ብቻ ናቸው።' : 'Only an administrator can authorize capacity overrides.'}
                </p>
              )}
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              {language === 'am' ? 'ምደባውን አረጋግጥ' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: End Assignment */}
      <Modal
        isOpen={Boolean(endingAssignmentId)}
        onClose={() => setEndingAssignmentId(null)}
        title={t('endAssignment')}
        description={language === 'am' ? 'እባክዎ ግለሰቡን ከቤተሰብ ያሰናበቱበትን ምክንያት ይመዝግቡ።' : 'Please record the reason for relieving or removing this person from the family.'}
      >
        <form onSubmit={handleEndAssignmentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'am' ? 'የማብቂያ ምክንያት' : 'End Reason'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={language === 'am' ? 'ለምሳሌ፡ ተመርቋል፣ ተዛውሯል፣ በግል ጥያቄ...' : 'e.g. Graduated, relocated, transferred, personal leave...'}
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEndingAssignmentId(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {language === 'am' ? 'ምደባውን አብቃ' : 'Confirm End Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
