import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { 
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, 
  ArrowRight, User, ShieldCheck 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  // Modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [allowCapacityOverride, setAllowCapacityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['transfer', id],
    queryFn: async () => {
      const res = await api.get(`/transfers/${id}`);
      return res.data.transfer;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/transfers/${id}/approve`, {
        decisionNote,
        allowCapacityOverride,
        overrideReason: allowCapacityOverride ? overrideReason : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setShowApproveModal(false);
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || (language === 'am' ? 'ዝውውሩን ማጽደቅ አልተቻለም' : 'Failed to approve transfer.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/transfers/${id}/reject`, {
        decisionNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setShowRejectModal(false);
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || (language === 'am' ? 'ዝውውሩን ውድቅ ማድረግ አልተቻለም' : 'Failed to reject transfer.'));
    },
  });

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
      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-6 rounded-xl text-center max-w-xl mx-auto my-12 border border-rose-200 dark:border-rose-800">
        <h3 className="text-lg font-bold">{language === 'am' ? 'የዝውውር ጥያቄው አልተገኘም' : 'Transfer request not found'}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {language === 'am' ? 'የተጠየቀው የዝውውር መለያ ቁጥር ላይገኝ ወይም ተሰርዞ ሊሆን ይችላል።' : 'The requested transfer ID may not exist or has been removed.'}
        </p>
        <button
          onClick={() => navigate('/transfers')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToTransfers')}
        </button>
      </div>
    );
  }

  const isOverCapacity = data.destinationCurrentMembers >= data.destinationCapacity;
  const isPending = data.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/transfers')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-[#F4F0E7] hover:bg-slate-100 dark:hover:bg-[#1A2536] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
                {t('transferId')} #{data.transferId}
              </h1>
              <Badge status={data.status} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {language === 'am' ? 'የተጠየቀው በ' : 'Submitted on'} {new Date(data.requestedAt).toLocaleDateString()} {language === 'am' ? 'በ' : 'by'} {data.requestedByName} (@{data.requestedByUsername})
            </p>
          </div>
        </div>

        {/* Action Buttons for Admins on Pending requests */}
        {user?.role === 'ADMIN' && isPending && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActionError('');
                setDecisionNote('');
                setAllowCapacityOverride(isOverCapacity);
                setOverrideReason('');
                setShowApproveModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition"
            >
              <CheckCircle2 className="w-4 h-4" /> {t('approveTransfer')}
            </button>
            <button
              onClick={() => {
                setActionError('');
                setDecisionNote('');
                setShowRejectModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 shadow-sm transition"
            >
              <XCircle className="w-4 h-4" /> {t('rejectTransfer')}
            </button>
          </div>
        )}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Student & Family Information */}
        <div className="md:col-span-2 space-y-6">
          {/* Family Transfer Visual Flow Card */}
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-4">
              {t('transferRoute')}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-[#121A28] rounded-xl border border-slate-200 dark:border-[#29384E]">
              {/* Origin Family */}
              <div className="flex-1 w-full text-center sm:text-left bg-white dark:bg-[#1A2536] p-4 rounded-lg border border-slate-200 dark:border-[#29384E]">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  {t('originFamily')}
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-[#F4F0E7] mt-1">{data.fromFamilyName || t('unassigned')}</p>
                {data.fromFamilyId ? (
                  <Link
                    to={`/families/${data.fromFamilyId}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                  >
                    {language === 'am' ? 'ቤተሰቡን ተመልከት' : 'View Family'} ({data.fromFamilyCode}) &rarr;
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic">{language === 'am' ? 'የቀድሞ ቤተሰብ የለም' : 'No previous family'}</span>
                )}
              </div>

              {/* Arrow */}
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-900/50">
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* Destination Family */}
              <div className="flex-1 w-full text-center sm:text-left bg-white dark:bg-[#1A2536] p-4 rounded-lg border border-slate-200 dark:border-[#29384E]">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  {t('destinationFamily')}
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-[#F4F0E7] mt-1">{data.toFamilyName}</p>
                <div className="flex items-center justify-between mt-2">
                  <Link
                    to={`/families/${data.toFamilyId}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {language === 'am' ? 'ቤተሰቡን ተመልከት' : 'View Family'} ({data.toFamilyCode}) &rarr;
                  </Link>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isOverCapacity ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {data.destinationCurrentMembers} / {data.destinationCapacity} {language === 'am' ? 'አባላት' : 'members'}
                  </span>
                </div>
              </div>
            </div>

            {/* Over capacity warning */}
            {isOverCapacity && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{t('capacityWarning')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reason & Statement */}
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-3">
              {t('transferReason')}
            </h2>
            <div className="bg-slate-50 dark:bg-[#121A28] p-4 rounded-lg border border-slate-200 dark:border-[#29384E] text-slate-800 dark:text-[#F4F0E7] text-sm whitespace-pre-wrap leading-relaxed">
              {data.reason}
            </div>
          </div>

          {/* Decision Outcome Card (If not pending) */}
          {!isPending && (
            <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {language === 'am' ? 'የአስተዳዳሪ ውሳኔ ውጤት' : 'Administrative Decision'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('status')}</dt>
                  <dd className="mt-1"><Badge status={data.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">{language === 'am' ? 'የተወሰነበት ቀን' : 'Decided On'}</dt>
                  <dd className="mt-1 text-slate-800 dark:text-[#F4F0E7] font-medium">
                    {data.decidedAt ? new Date(data.decidedAt).toLocaleString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">{language === 'am' ? 'የወሰነው አካል' : 'Decided By'}</dt>
                  <dd className="mt-1 text-slate-800 dark:text-[#F4F0E7] font-medium">
                    {data.approvedByName ? `${data.approvedByName} (@${data.approvedByUsername})` : '—'}
                  </dd>
                </div>
                {data.isCapacityOverride && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400 font-medium">{language === 'am' ? 'የአቅም ማለፊያ' : 'Capacity Override'}</dt>
                    <dd className="mt-1 text-amber-700 dark:text-amber-300 font-semibold">{language === 'am' ? 'ልዩ የአስተዳዳሪ ማለፊያ' : 'Yes (Admin Override)'}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('decisionNote')}</dt>
                  <dd className="mt-1 text-slate-800 dark:text-[#F4F0E7] bg-slate-50 dark:bg-[#121A28] p-3 rounded-lg border border-slate-200 dark:border-[#29384E]">
                    {data.decisionNote || (language === 'am' ? 'ምንም የተለየ ማስታወሻ አልተሰጠም።' : 'No specific note provided.')}
                  </dd>
                </div>
                {data.capacityOverrideReason && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-amber-700 dark:text-amber-300 font-medium">{t('overrideReason')}</dt>
                    <dd className="mt-1 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      {data.capacityOverrideReason}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right Column: Student Profile Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t('studentProfile')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('studentName')}</span>
                <span className="font-semibold text-slate-900 dark:text-[#F4F0E7]">{data.studentName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('studentId')}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{data.universityStudentId || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('gender')}</span>
                <span className="text-slate-800 dark:text-[#F4F0E7] capitalize">
                  {data.gender === 'MALE' ? t('male') : data.gender === 'FEMALE' ? t('female') : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('department')}</span>
                <span className="text-slate-800 dark:text-[#F4F0E7]">{data.departmentName || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('academicStage')}</span>
                <span className="text-slate-800 dark:text-[#F4F0E7]">{data.academicStage || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('phone')}</span>
                <span className="text-slate-800 dark:text-[#F4F0E7]">{data.studentPhone || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{t('email')}</span>
                <span className="text-slate-800 dark:text-[#F4F0E7]">{data.studentEmail || '—'}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#29384E]">
                <Link
                  to={`/students/${data.studentId}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition"
                >
                  {language === 'am' ? 'ሙሉ የተማሪ መገለጫን ተመልከት' : 'View Full Student Profile'} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={t('approveTransfer')}
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
              {actionError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {language === 'am' ? 'ተማሪ ' : 'You are about to transfer '}
            <strong className="text-slate-900 dark:text-white">{data.studentName}</strong> {language === 'am' ? 'ከ' : 'from'}{' '}
            <strong className="text-slate-900 dark:text-white">{data.fromFamilyName || t('unassigned')}</strong> {language === 'am' ? 'ወደ' : 'to'} <strong className="text-slate-900 dark:text-white">{data.toFamilyName}</strong>{language === 'am' ? ' ማዛወር ይፈልጋሉ።' : '.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('decisionNote')} ({language === 'am' ? 'አማራጭ' : 'Optional'})
            </label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={2}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder={language === 'am' ? 'ለምሳሌ፡ በተማሪው ጥያቄ መሰረት ጸድቋል።' : "e.g. Approved per student's request."}
            />
          </div>

          {/* Capacity Override Checkbox */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#29384E]">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCapacityOverride}
                onChange={(e) => setAllowCapacityOverride(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F4F0E7]">
                  {t('allowOverride')}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'am' ? `መድረሻው ቤተሰብ ${data.destinationCurrentMembers}/${data.destinationCapacity} አባላት አሉት። ልዩ ማለፊያ መስጠት ከፈለጉ ይህን ይምረጡ።` : `Destination family has ${data.destinationCurrentMembers}/${data.destinationCapacity} members. Check this if you are granting an explicit override.`}
                </p>
              </div>
            </label>
          </div>

          {allowCapacityOverride && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('overrideReason')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
                placeholder={language === 'am' ? 'የአቅም ገደቡ ያለፈበትን ምክንያት ይጻፉ...' : 'State the reason why capacity is being exceeded...'}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || (allowCapacityOverride && !overrideReason.trim())}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {approveMutation.isPending ? t('loading') : t('confirmApproval')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t('rejectTransfer')}
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
              {actionError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {language === 'am' ? `የተማሪ ${data.studentName} ወደ ${data.toFamilyName} ዝውውር ጥያቄ ውድቅ ለማድረግ እባክዎ ምክንያት ይጥቀሱ።` : `Please provide a reason for rejecting the transfer of ${data.studentName} to ${data.toFamilyName}.`}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('decisionNote')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={3}
              required
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder={language === 'am' ? 'ለምሳሌ፡ መድረሻው ቤተሰብ አቅሙ ስለሞላ እና ተጨማሪ ተማሪ መመደብ ስለማይቻል...' : 'e.g. Destination family is full and no more allocations are allowed.'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !decisionNote.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              {rejectMutation.isPending ? t('loading') : t('confirmRejection')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
