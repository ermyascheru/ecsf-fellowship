import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { 
  ArrowLeft, User, Phone, Mail, 
  Edit3, Shield, Award, School 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const PersonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [editError, setEditError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const res = await api.get(`/people/${id}`);
      return res.data;
    },
  });

  const updatePersonMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/people/${id}`, {
        fullName,
        phone,
        email: email.trim() ? email.trim() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowEditModal(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.error || (language === 'am' ? 'የግለሰቡን መረጃ ማዘመን አልተቻለም' : 'Failed to update person.'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-6 rounded-xl text-center max-w-xl mx-auto my-12 border border-rose-200 dark:border-rose-800">
        <h3 className="text-lg font-bold">{language === 'am' ? 'ግለሰቡ አልተገኘም' : 'Person not found'}</h3>
        <p className="mt-2 text-sm">{language === 'am' ? 'የግለሰቡ መዝገብ የለም ወይም ተሰርዟል።' : 'The person record does not exist or has been removed.'}</p>
        <button
          onClick={() => navigate('/students')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToStudents')}
        </button>
      </div>
    );
  }

  const { person, student, account, familyRoles = [] } = data;

  const openEdit = () => {
    setFullName(person.fullName);
    setPhone(person.phone);
    setEmail(person.email || '');
    setEditError('');
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] hover:bg-slate-100 dark:hover:bg-[#1A2536] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">{person.fullName}</h1>
              <span className="text-xs px-2.5 py-0.5 bg-slate-100 dark:bg-[#121A28] text-slate-600 dark:text-slate-300 rounded-full font-mono font-medium border border-slate-200/50 dark:border-[#29384E]">
                Person ID #{person.personId}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'am' ? 'የተመዘገበው በ' : 'Registered on'} {new Date(person.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={openEdit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] text-slate-700 dark:text-[#F4F0E7] rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#223045] shadow-sm transition"
        >
          <Edit3 className="w-4 h-4" /> {t('edit')}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal info & login account */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t('personalDetails')}
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">{t('studentName')}</span>
                <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] text-sm">{person.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">{t('phone')}</span>
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-[#F4F0E7] mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {person.phone}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">{t('email')}</span>
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-[#F4F0E7] mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {person.email || (language === 'am' ? 'አልተሰጠም' : 'None provided')}
                </div>
              </div>
            </div>
          </div>

          {/* Fellowship Account Info if applicable */}
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {language === 'am' ? 'የህብረት መግቢያ መለያ' : 'Fellowship Login Account'}
            </h2>
            {account ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{t('username')}</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] font-mono">@{account.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{t('systemRole')}</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {account.role}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{t('status')}</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    account.isActive ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {account.isActive ? t('active') : t('inactive')}
                  </span>
                </div>
                {account.lastLoginAt && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">{t('lastLogin')}</span>
                    <span className="text-slate-700 dark:text-slate-300">{new Date(account.lastLoginAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'am' ? 'ይህ ግለሰብ የመግቢያ መለያ የለውም። (የመግቢያ መለያ የተፈቀደው ለተመረጡ አስተዳዳሪዎች እና መሪዎች ብቻ ነው)።' : 'This person does not have a login account. (Only designated Fellowship Leaders and Admins hold accounts).'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Student Profile & Family Service History */}
        <div className="md:col-span-2 space-y-6">
          {/* Student Status Card */}
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {language === 'am' ? 'የተማሪ ምዝገባ መዝገብ' : 'Student Enrollment Record'}
              </h2>
              {student && (
                <Link
                  to={`/students/${student.studentId}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {language === 'am' ? 'ሙሉ የተማሪ መገለጫ' : 'View Full Student Profile'} &rarr;
                </Link>
              )}
            </div>

            {student ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t('studentId')}</dt>
                  <dd className="font-mono font-medium text-slate-900 dark:text-[#F4F0E7] mt-0.5">
                    {student.universityStudentId || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t('department')}</dt>
                  <dd className="font-medium text-slate-900 dark:text-[#F4F0E7] mt-0.5">
                    {student.departmentName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t('academicStage')}</dt>
                  <dd className="font-medium text-slate-900 dark:text-[#F4F0E7] mt-0.5">
                    {student.stageName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t('gcStatus')}</dt>
                  <dd className="font-medium text-slate-900 dark:text-[#F4F0E7] mt-0.5">
                    {student.classificationName || (language === 'am' ? 'የለም' : 'None')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t('participation')}</dt>
                  <dd className="mt-0.5">
                    <Badge status={student.participationStatus} />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'am' ? 'ይህ ግለሰብ እንደ ዩኒቨርሲቲ ተማሪ አልተመዘገበም።' : 'This individual is not registered as an enrolled university student.'}
              </p>
            )}
          </div>

          {/* Family Roles & Leadership History */}
          <div className="bg-white dark:bg-[#1A2536] p-6 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F0E7] mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {language === 'am' ? 'የቤተሰብ ምደባዎች እና የአገልግሎት ታሪክ' : 'Family Assignments & Service History'}
            </h2>

            {familyRoles.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'am' ? 'የተመዘገበ ንቁ ወይም ያለፈ የቤተሰብ አባልነት ወይም የመሪነት ታሪክ የለም።' : 'No active or historical family memberships or leadership roles recorded.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#121A28] border-b border-slate-200 dark:border-[#29384E] text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">{t('systemRole')}</th>
                      <th className="py-2.5 px-3">{t('family')}</th>
                      <th className="py-2.5 px-3">{language === 'am' ? 'የጀመረበት ቀን' : 'Start Date'}</th>
                      <th className="py-2.5 px-3">{language === 'am' ? 'የአበቃበት ቀን' : 'End Date'}</th>
                      <th className="py-2.5 px-3">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                    {familyRoles.map((role: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#223045]/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-[#F4F0E7]">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            role.role === 'DAD' || role.role === 'MOM'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {role.role === 'DAD' ? t('dadRole') : role.role === 'MOM' ? t('momRole') : t('memberRole')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            to={`/families/${role.familyId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            {role.familyName} ({role.familyCode})
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {role.startDate ? new Date(role.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {role.endDate ? new Date(role.endDate).toLocaleDateString() : (language === 'am' ? 'የአሁን' : 'Current')}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge status={role.isCurrent ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Person Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={language === 'am' ? 'የግለሰብ መረጃ አስተካክል' : 'Edit Person Details'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updatePersonMutation.mutate();
          }}
          className="space-y-4"
        >
          {editError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('studentName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('phone')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('email')} ({language === 'am' ? 'አማራጭ' : 'Optional'})
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={updatePersonMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updatePersonMutation.isPending ? t('loading') : t('saveChanges')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
