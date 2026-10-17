import React, { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';

const familySchema = z.object({
  familyCode: z.string().min(1, 'Family code is required'),
  familyName: z.string().min(2, 'Family name is required'),
  memberCapacity: z.coerce.number().int().min(0, 'Capacity must be 0 or higher'),
  isActive: z.boolean().default(true),
});

type FamilyFormData = z.infer<typeof familySchema>;

export const FamilyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  const { data: existingData, isLoading: loadingExisting } = useQuery({
    queryKey: ['family-detail', id],
    queryFn: async () => {
      const res = await api.get(`/families/${id}`);
      return res.data;
    },
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      familyCode: '',
      familyName: '',
      memberCapacity: 10,
      isActive: true,
    },
  });

  useEffect(() => {
    if (existingData?.family) {
      const f = existingData.family;
      reset({
        familyCode: f.familyCode,
        familyName: f.familyName,
        memberCapacity: f.memberCapacity,
        isActive: f.isActive,
      });
    }
  }, [existingData, reset]);

  const onSubmit = async (values: FamilyFormData) => {
    try {
      if (isEdit) {
        await api.put(`/families/${id}`, values);
      } else {
        await api.post('/families', values);
      }
      queryClient.invalidateQueries({ queryKey: ['families-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/families');
    } catch (err: any) {
      alert(err.response?.data?.error || (language === 'am' ? 'የቤተሰብ መረጃን ማስቀመጥ አልተቻለም።' : 'Failed to save family details.'));
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/families"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToFamilies')}</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
          {isEdit ? t('editFamilyInfo') : t('createFamily')}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 md:p-8 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {t('familyCode')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('familyCode')}
            placeholder="e.g. FAM-BTH or F-001"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {errors.familyCode && (
            <p className="mt-1 text-xs text-rose-600">{errors.familyCode.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {t('familyName')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('familyName')}
            placeholder={language === 'am' ? 'ለምሳሌ፡ ቤቴል ቤተሰብ' : 'e.g. Bethel Family'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {errors.familyName && (
            <p className="mt-1 text-xs text-rose-600">{errors.familyName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {t('memberCapacity')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            {...register('memberCapacity')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">
            {language === 'am' ? 'የአቅም ገደብ የመደበኛ ተማሪ አባላትን ከፍተኛ ቁጥር ይወስናል። አባቶች እና እናቶች የመሪነት ሚና ስላላቸው ቦታ አይይዙም።' : 'Capacity specifies the maximum target for ordinary student members. Dads and Moms are leadership roles and do not consume member spaces.'}
          </p>
          {errors.memberCapacity && (
            <p className="mt-1 text-xs text-rose-600">{errors.memberCapacity.message}</p>
          )}
        </div>

        {isEdit && (
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{language === 'am' ? 'ቤተሰቡ በአሁኑ ሰዓት ንቁ አገልግሎት ላይ ነው' : 'Family is currently active'}</span>
            </label>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-[#29384E] flex items-center justify-end gap-3">
          <Link
            to="/families"
            className="px-4 py-2 border border-slate-200 dark:border-[#29384E] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#223045] rounded-lg text-sm font-medium transition-colors"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? t('loading') : t('save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
