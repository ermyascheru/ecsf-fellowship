import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Modal } from '../../components/common/Modal.js';
import { 
  School, BookOpen, Layers, Plus, 
  ShieldAlert 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  // Modals
  const [modalType, setModalType] = useState<'dept' | 'stage' | 'gc' | null>(null);
  const [name, setName] = useState('');
  const [yearNumber, setYearNumber] = useState<number>(1);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings-metadata'],
    queryFn: async () => {
      const res = await api.get('/settings/metadata');
      return res.data;
    },
  });

  const addDeptMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/departments', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-metadata'] });
      setModalType(null);
      setName('');
      setModalError('');
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.error || (language === 'am' ? 'ዲፓርትመንት ማከል አልተቻለም' : 'Failed to add department.'));
    },
  });

  const addStageMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/stages', {
        name,
        yearNumber: Number(yearNumber),
        displayOrder: Number(displayOrder),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-metadata'] });
      setModalType(null);
      setName('');
      setModalError('');
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.error || (language === 'am' ? 'የትምህርት ደረጃ ማከል አልተቻለም' : 'Failed to add academic stage.'));
    },
  });

  const addGcMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/gc-classifications', {
        name,
        description: description.trim() ? description.trim() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-metadata'] });
      setModalType(null);
      setName('');
      setDescription('');
      setModalError('');
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.error || (language === 'am' ? 'የተመራቂነት ምድብ ማከል አልተቻለም' : 'Failed to add GC classification.'));
    },
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-8 rounded-xl max-w-lg mx-auto my-12 text-center border border-rose-200 dark:border-rose-800">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold">{t('accessRestricted')}</h2>
        <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
          {t('adminOnlyNotice')}
        </p>
      </div>
    );
  }

  const departments = data?.departments || [];
  const academicStages = data?.academicStages || [];
  const gcClassifications = data?.gcClassifications || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
          {t('settingsTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('settingsSubtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 dark:text-rose-400 text-sm">
          {language === 'am' ? 'የስርዓት መረጃዎችን መጫን አልተቻለም።' : 'Failed to load system metadata.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Departments */}
          <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                    <School className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F0E7]">{t('department')}</h2>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#121A28] text-slate-700 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-[#29384E]">
                  {departments.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {language === 'am' ? 'ለተማሪዎች ምዝገባ የሚያገለግሉ የዩኒቨርሲቲው ክፍሎች።' : 'University departments and faculties for student registration.'}
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-[#29384E] max-h-72 overflow-y-auto text-xs">
                {departments.map((d: any) => (
                  <li key={d.id} className="py-2 flex items-center justify-between text-slate-800 dark:text-[#F4F0E7]">
                    <span>{d.name}</span>
                    <span className="text-slate-400 dark:text-slate-400 font-mono text-[10px]">#{d.id}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                setName('');
                setModalError('');
                setModalType('dept');
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition border border-blue-200 dark:border-blue-900/40"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addDepartment')}
            </button>
          </div>

          {/* Academic Stages */}
          <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F0E7]">{t('academicStage')}</h2>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#121A28] text-slate-700 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-[#29384E]">
                  {academicStages.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {language === 'am' ? 'የትምህርት ዓመት ቅደም ተከተል (0 ዓመት = ሬሜዲያል)።' : 'Sequential university year progression (Year 0 = Remedial).'}
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-[#29384E] max-h-72 overflow-y-auto text-xs">
                {academicStages.map((s: any) => (
                  <li key={s.id} className="py-2 flex items-center justify-between text-slate-800 dark:text-[#F4F0E7]">
                    <div>
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {language === 'am' ? 'ዓመት' : 'Year'} {s.yearNumber} &bull; {language === 'am' ? 'ቅደም ተከተል' : 'Order'} {s.displayOrder}
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-400 font-mono text-[10px]">#{s.id}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                setName('');
                setYearNumber(academicStages.length);
                setDisplayOrder(academicStages.length);
                setModalError('');
                setModalType('stage');
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition border border-emerald-200 dark:border-emerald-900/40"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addStage')}
            </button>
          </div>

          {/* GC Classifications */}
          <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F0E7]">{t('gcStatus')}</h2>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#121A28] text-slate-700 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-[#29384E]">
                  {gcClassifications.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {language === 'am' ? 'የተናጠል የተመራቂነት (Graduating Class) ምድቦች።' : 'Independent manual Graduating Class classifications.'}
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-[#29384E] max-h-72 overflow-y-auto text-xs">
                {gcClassifications.map((g: any) => (
                  <li key={g.id} className="py-2 flex items-center justify-between text-slate-800 dark:text-[#F4F0E7]">
                    <div>
                      <span className="font-semibold">{g.name}</span>
                      {g.description && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{g.description}</span>
                      )}
                    </div>
                    <span className="text-slate-400 dark:text-slate-400 font-mono text-[10px]">#{g.id}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                setName('');
                setDescription('');
                setModalError('');
                setModalType('gc');
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition border border-purple-200 dark:border-purple-900/40"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addGc')}
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={
          modalType === 'dept'
            ? t('addDepartment')
            : modalType === 'stage'
            ? t('addStage')
            : t('addGc')
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (modalType === 'dept') addDeptMutation.mutate();
            if (modalType === 'stage') addStageMutation.mutate();
            if (modalType === 'gc') addGcMutation.mutate();
          }}
          className="space-y-4"
        >
          {modalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'am' ? 'ስም' : 'Name'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                modalType === 'dept'
                  ? (language === 'am' ? 'ለምሳሌ፡ ኤሌክትሪካል ኢንጂነሪንግ' : 'e.g. Electrical Engineering')
                  : modalType === 'stage'
                  ? (language === 'am' ? 'ለምሳሌ፡ ሬሜዲያል (0 ዓመት)' : 'e.g. Remedial (Year 0)')
                  : (language === 'am' ? 'ለምሳሌ፡ ተመራቂ 2018 (GC 2026)' : 'e.g. GC 2026')
              }
            />
          </div>

          {modalType === 'stage' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የትምህርት ዓመት ቁጥር (0 ለሬሜዲያል፣ 1 ለ1ኛ ዓመት...)' : 'Year Number (0 for Remedial, 1 for Year 1, etc.)'}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={yearNumber}
                  onChange={(e) => setYearNumber(parseInt(e.target.value, 10))}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የማሳያ ቅደም ተከተል' : 'Display Order'}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {modalType === 'gc' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {language === 'am' ? 'ማብራሪያ (አማራጭ)' : 'Description (Optional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
                placeholder={language === 'am' ? 'ለምሳሌ፡ የ2018 ተመራቂ ተማሪዎች ምድብ' : 'e.g. Final graduating class of 2026'}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={
                addDeptMutation.isPending ||
                addStageMutation.isPending ||
                addGcMutation.isPending
              }
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {addDeptMutation.isPending || addStageMutation.isPending || addGcMutation.isPending ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
