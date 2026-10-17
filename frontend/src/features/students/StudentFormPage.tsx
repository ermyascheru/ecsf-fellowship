import React, { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';

const studentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number must be at least 7 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  universityStudentId: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE']),
  departmentId: z.coerce.number().optional().nullable(),
  academicStageId: z.coerce.number().optional().nullable(),
  gcClassificationId: z.coerce.number().optional().nullable(),
  enrollmentDate: z.string().optional().or(z.literal('')),
  participationStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  familyId: z.coerce.number().optional().nullable(),
  familyRole: z.enum(['DAD', 'MOM', 'MEMBER']).default('MEMBER'),
});

type StudentFormData = z.infer<typeof studentSchema>;

export const StudentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  // Load dropdown metadata
  const { data: metadata } = useQuery({
    queryKey: ['settings-metadata'],
    queryFn: async () => {
      const res = await api.get('/settings/metadata');
      return res.data;
    },
  });

  // If edit mode, load student data
  const { data: existingData, isLoading: loadingExisting } = useQuery({
    queryKey: ['student-detail', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data;
    },
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      universityStudentId: '',
      gender: 'MALE',
      departmentId: null,
      academicStageId: null,
      gcClassificationId: null,
      enrollmentDate: '',
      participationStatus: 'ACTIVE',
      familyId: null,
      familyRole: 'MEMBER',
    },
  });

  useEffect(() => {
    if (existingData?.student) {
      const s = existingData.student;
      reset({
        fullName: s.fullName || '',
        phone: s.phone || '',
        email: s.email || '',
        universityStudentId: s.universityStudentId || '',
        gender: s.gender || 'MALE',
        departmentId: s.departmentId || null,
        academicStageId: s.academicStageId || null,
        gcClassificationId: s.gcClassificationId || null,
        enrollmentDate: s.enrollmentDate ? s.enrollmentDate.substring(0, 10) : '',
        participationStatus: s.participationStatus || 'ACTIVE',
      });
    }
  }, [existingData, reset]);

  const onSubmit = async (values: StudentFormData) => {
    try {
      const payload = {
        ...values,
        email: values.email?.trim() || null,
        universityStudentId: values.universityStudentId?.trim() || null,
        enrollmentDate: values.enrollmentDate?.trim() || null,
      };

      if (isEdit) {
        await api.put(`/students/${id}`, payload);
      } else {
        await api.post('/students', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/students');
    } catch (err: any) {
      alert(err.response?.data?.error || (language === 'am' ? 'የተማሪውን መረጃ ማስቀመጥ አልተቻለም።' : 'Failed to save student profile.'));
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToStudents')}</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-[#F4F0E7] tracking-tight">
          {isEdit ? t('editStudent') : t('addStudent')}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200/90 dark:border-[#29384E] p-6 md:p-8 shadow-sm space-y-6">
        {/* Personal Details Section */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F4F0E7] border-b border-slate-100 dark:border-[#29384E] pb-2 mb-4">
            {t('personalDetails')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('studentName')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('fullName')}
                placeholder={language === 'am' ? 'ለምሳሌ፡ ሰላም ተስፋዬ' : 'e.g. Selam Tesfaye'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('phone')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('phone')}
                placeholder="e.g. +251-912-345678"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('email')} ({language === 'am' ? 'አማራጭ' : 'Optional'})
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. selam@student.example.org"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('gender')} <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="MALE">{t('male')}</option>
                <option value="FEMALE">{t('female')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Academic Details Section */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F4F0E7] border-b border-slate-100 dark:border-[#29384E] pb-2 mb-4">
            {t('academicDetails')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('studentId')}
              </label>
              <input
                type="text"
                {...register('universityStudentId')}
                placeholder="e.g. FTVTI/2024/001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('department')}
              </label>
              <select
                {...register('departmentId')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">{language === 'am' ? '-- ዲፓርትመንት ይምረጡ --' : 'Select Department'}</option>
                {metadata?.departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('academicStage')}
              </label>
              <select
                {...register('academicStageId')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">{language === 'am' ? '-- የትምህርት ደረጃ ይምረጡ --' : 'Select Academic Stage'}</option>
                {metadata?.academicStages.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({language === 'am' ? 'ዓመት' : 'Year'} {s.yearNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('gcStatus')}
              </label>
              <select
                {...register('gcClassificationId')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">{language === 'am' ? '-- የተመራቂነት ሁኔታ ይምረጡ --' : 'Select GC Designation'}</option>
                {metadata?.gcClassifications.map((gc: any) => (
                  <option key={gc.id} value={gc.id}>
                    {gc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('enrollmentDate')}
              </label>
              <input
                type="date"
                {...register('enrollmentDate')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Initial Family Assignment (New student only) */}
        {!isEdit && (
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F4F0E7] border-b border-slate-100 dark:border-[#29384E] pb-2 mb-4">
              {t('familyPlacement')} ({language === 'am' ? 'አማራጭ' : 'Optional'})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('family')}
                </label>
                <select
                  {...register('familyId')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">{language === 'am' ? 'በኋላ መድብ / አልተመደበም' : 'Assign Later / None'}</option>
                  {metadata?.families.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code} - {t('memberCapacity')} {f.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('systemRole')}
                </label>
                <select
                  {...register('familyRole')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="MEMBER">{t('memberRole')} ({language === 'am' ? 'ከአቅም ገደብ የሚቆጠር' : 'Counts toward capacity'})</option>
                  <option value="DAD">{t('dadRole')} ({language === 'am' ? 'የቤተሰብ መሪ - የማይቆጠር' : 'Leadership - Uncounted'})</option>
                  <option value="MOM">{t('momRole')} ({language === 'am' ? 'የቤተሰብ መሪ - የማይቆጠር' : 'Leadership - Uncounted'})</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#29384E] flex items-center justify-end gap-3">
          <Link
            to="/students"
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
