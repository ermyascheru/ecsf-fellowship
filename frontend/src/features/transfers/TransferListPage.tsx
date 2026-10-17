import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { TransferItem } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';

export const TransferListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('status') || 'PENDING';
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();

  // Create Request Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [targetFamilyId, setTargetFamilyId] = useState<number | ''>('');
  const [transferReason, setTransferReason] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);

  // Approval Modal state
  const [approvingTransfer, setApprovingTransfer] = useState<TransferItem | null>(null);
  const [allowCapacityOverride, setAllowCapacityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Rejection Modal state
  const [rejectingTransfer, setRejectingTransfer] = useState<TransferItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Fetch transfers with counts
  const { data, isLoading } = useQuery<{
    tabCounts: { pending: number; approved: number; rejected: number; total: number };
    transfers: TransferItem[];
  }>({
    queryKey: ['transfers-list', activeTab],
    queryFn: async () => {
      const res = await api.get(`/transfers?status=${activeTab}`);
      return res.data;
    },
  });

  // Fetch students & families for transfer request modal
  const { data: studentsData } = useQuery({
    queryKey: ['students-brief'],
    queryFn: async () => {
      const res = await api.get('/students?limit=200');
      return res.data.students;
    },
    enabled: isRequestModalOpen,
  });

  const { data: metadata } = useQuery({
    queryKey: ['settings-metadata'],
    queryFn: async () => {
      const res = await api.get('/settings/metadata');
      return res.data;
    },
    enabled: isRequestModalOpen,
  });

  const tabCounts = data?.tabCounts || { pending: 0, approved: 0, rejected: 0, total: 0 };
  const transfers = data?.transfers || [];

  const handleTabClick = (tab: string) => {
    setSearchParams({ status: tab });
  };

  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    if (!selectedStudentId || !targetFamilyId || !transferReason.trim()) {
      setRequestError(language === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ይሙሉ' : 'Please fill in all required fields.');
      return;
    }

    try {
      await api.post('/transfers', {
        studentId: Number(selectedStudentId),
        toFamilyId: Number(targetFamilyId),
        reason: transferReason.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ['transfers-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsRequestModalOpen(false);
      setSelectedStudentId('');
      setTargetFamilyId('');
      setTransferReason('');
    } catch (err: any) {
      setRequestError(err.response?.data?.error || (language === 'am' ? 'የዝውውር ጥያቄውን ማቅረብ አልተቻለም' : 'Failed to submit transfer request.'));
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTransfer) return;
    setApprovalError(null);

    try {
      await api.post(`/transfers/${approvingTransfer.transferId}/approve`, {
        decisionNote: approvalNote.trim() || null,
        allowCapacityOverride,
        overrideReason: allowCapacityOverride ? overrideReason.trim() : null,
      });

      queryClient.invalidateQueries({ queryKey: ['transfers-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['families-list'] });
      setApprovingTransfer(null);
      setApprovalNote('');
      setAllowCapacityOverride(false);
      setOverrideReason('');
    } catch (err: any) {
      setApprovalError(err.response?.data?.error || (language === 'am' ? 'ዝውውሩን ማጽደቅ አልተቻለም' : 'Failed to approve transfer.'));
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTransfer || !rejectionNote.trim()) return;
    setRejectionError(null);

    try {
      await api.post(`/transfers/${rejectingTransfer.transferId}/reject`, {
        decisionNote: rejectionNote.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ['transfers-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setRejectingTransfer(null);
      setRejectionNote('');
    } catch (err: any) {
      setRejectionError(err.response?.data?.error || (language === 'am' ? 'ዝውውሩን ውድቅ ማድረግ አልተቻለም' : 'Failed to reject transfer.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
            {t('transfersTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('transfersSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('requestTransfer')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#29384E] gap-6 text-sm font-semibold">
        <button
          onClick={() => handleTabClick('PENDING')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'PENDING'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <span>{t('tabPending')}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs">
            {tabCounts.pending}
          </span>
        </button>

        <button
          onClick={() => handleTabClick('APPROVED')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'APPROVED'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <span>{t('tabApproved')}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs">
            {tabCounts.approved}
          </span>
        </button>

        <button
          onClick={() => handleTabClick('REJECTED')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'REJECTED'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <span>{t('tabRejected')}</span>
          <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
            {tabCounts.rejected}
          </span>
        </button>
      </div>

      {/* Transfers Data Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#29384E] text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-[#121A28]/60">
                <th className="px-6 py-3.5">{t('studentName')}</th>
                <th className="px-4 py-3.5">{t('originFamily')}</th>
                <th className="px-4 py-3.5">{t('destinationFamily')}</th>
                <th className="px-4 py-3.5">{t('transferReason')}</th>
                <th className="px-4 py-3.5">{t('requestedBy')}</th>
                <th className="px-4 py-3.5">{t('requestDate')}</th>
                <th className="px-6 py-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29384E] text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : transfers.length > 0 ? (
                transfers.map((item) => (
                  <tr key={item.transferId} className="hover:bg-slate-50/70 dark:hover:bg-[#223045]/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-[#F4F0E7]">
                      <Link to={`/students/${item.studentId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                        {item.studentName}
                      </Link>
                      {item.universityStudentId && (
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">
                          {item.universityStudentId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {item.fromFamilyName || <span className="text-slate-400 italic">{t('unassigned')}</span>}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40">
                        &rarr; {item.toFamilyName}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {item.requestedByName}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.status === 'PENDING' ? (
                        isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setApprovingTransfer(item);
                                setApprovalError(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold rounded text-xs border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              {t('approveTransfer')}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingTransfer(item);
                                setRejectionError(null);
                              }}
                              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold rounded text-xs border border-rose-200 dark:border-rose-800 transition-colors"
                            >
                              {t('rejectTransfer')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {language === 'am' ? 'የአስተዳዳሪ ውሳኔ በመጠባበቅ ላይ' : 'Pending Admin Review'}
                          </span>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant={item.status === 'APPROVED' ? 'active' : 'danger'}>
                            {item.status}
                          </Badge>
                          {item.isCapacityOverride && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium" title={item.capacityOverrideReason || ''}>
                              {language === 'am' ? 'ልዩ ማለፊያ' : 'Override'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {t('noTransfersFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Request Transfer */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={t('requestTransfer')}
        description={language === 'am' ? 'የህብረት መሪዎች እና አስተዳዳሪዎች ለማንኛውም ተማሪ የዝውውር ጥያቄ ማቅረብ ይችላሉ።' : 'Fellowship leaders and administrators may request a transfer for any student.'}
      >
        <form onSubmit={handleCreateRequestSubmit} className="space-y-4">
          {requestError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{requestError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t('selectStudent')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- {t('selectStudent')} --</option>
              {studentsData?.map((s: any) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.fullName} ({s.familyName ? `${language === 'am' ? 'የአሁን' : 'Current'}: ${s.familyName}` : t('unassigned')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t('targetFamily')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetFamilyId}
              onChange={(e) => setTargetFamilyId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- {t('chooseDestinationFamily')} --</option>
              {metadata?.families.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code} - {t('memberCapacity')}: {f.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t('transferReason')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={language === 'am' ? 'ዝርዝር ማብራሪያ ይጻፉ (የዶርም ለውጥ፣ የፀሎት ሰዓት መደራረብ፣ ወዘተ)...' : 'Provide a detailed justification (dormitory relocation, prayer schedule, mentorship need)...'}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              {t('submitTransferRequest')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Approve Transfer (With Capacity Override Check) */}
      <Modal
        isOpen={Boolean(approvingTransfer)}
        onClose={() => setApprovingTransfer(null)}
        title={t('approveTransfer')}
        description={`${language === 'am' ? 'ለ' : 'Confirm transfer for'} ${approvingTransfer?.studentName} ${language === 'am' ? 'ወደ' : 'to'} ${approvingTransfer?.toFamilyName}.`}
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          {approvalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-[#121A28] border border-slate-100 dark:border-[#29384E] rounded-lg text-xs space-y-1">
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{t('studentName')}: </span>
              {approvingTransfer?.studentName}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{t('transferRoute')}: </span>
              {approvingTransfer?.fromFamilyName || t('unassigned')} &rarr;{' '}
              <strong className="text-blue-700 dark:text-blue-400">{approvingTransfer?.toFamilyName}</strong>
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{t('capacityStatus')}: </span>
              {approvingTransfer?.destinationCurrentMembers} {language === 'am' ? 'ንቁ አባላት' : 'active members'} /{' '}
              {approvingTransfer?.destinationCapacity} {language === 'am' ? 'አቅም' : 'capacity'}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{t('transferReason')}: </span>
              {approvingTransfer?.reason}
            </p>
          </div>

          {/* Hard capacity alert if destination is at or over capacity */}
          {approvingTransfer &&
            approvingTransfer.destinationCurrentMembers >= approvingTransfer.destinationCapacity && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{language === 'am' ? 'የአቅም ገደብ ማስጠንቀቂያ፡ ' : 'Capacity Limit Warning: '}</strong>
                    {approvingTransfer.toFamilyName} {language === 'am' ? 'የተፈቀደውን አቅም ሞልቷል' : 'has reached its configured limit'} ({approvingTransfer.destinationCurrentMembers}/{approvingTransfer.destinationCapacity}).
                    {language === 'am' ? ' ለማጽደቅ የአስተዳዳሪ ልዩ ማለፊያ ግዴታ ነው።' : ' An explicit administrative override is mandatory.'}
                  </span>
                </div>

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
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                        {t('overrideReason')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={language === 'am' ? 'ለምሳሌ፡ በግቢው መጋቢ የተፈቀደ ልዩ የምክር አገልግሎት...' : 'e.g. Special pastoral mentorship approved by campus director...'}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        required={allowCapacityOverride}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#121A28] border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t('decisionNote')} ({language === 'am' ? 'አማራጭ' : 'Optional'})
            </label>
            <textarea
              rows={2}
              placeholder={language === 'am' ? 'ለቤተሰብ መሪዎች የሚሰጥ ማስታወሻ ወይም መመሪያ...' : 'Optional notes or instructions for family leaders...'}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setApprovingTransfer(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              {t('confirmApproval')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Reject Transfer */}
      <Modal
        isOpen={Boolean(rejectingTransfer)}
        onClose={() => setRejectingTransfer(null)}
        title={t('rejectTransfer')}
        description={`${language === 'am' ? 'ለ' : 'Record why the transfer request for'} ${rejectingTransfer?.studentName} ${language === 'am' ? 'የዝውውር ጥያቄ ውድቅ የተደረገበትን ምክንያት ይመዝግቡ።' : 'is being denied.'}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          {rejectionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{rejectionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t('decisionNote')} / {t('transferReason')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={language === 'am' ? 'ለምሳሌ፡ መድረሻው ቤተሰብ አቅሙ ስለሞላ እና ሚዛን ለመጠበቅ...' : 'e.g. Target family is full and no override permitted; maintaining balance in current family...'}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setRejectingTransfer(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {t('confirmRejection')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
