import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { Modal } from '../../components/common/Modal.js';
import { 
  Search, UserPlus, Phone, 
  Mail, Shield, Award, ChevronRight, UserCheck 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const PeopleListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['people', { search, page }],
    queryFn: async () => {
      const res = await api.get('/people', {
        params: { search, page, limit: 15 },
      });
      return res.data;
    },
  });

  const createPersonMutation = useMutation({
    mutationFn: async () => {
      await api.post('/people', {
        fullName,
        phone,
        email: email.trim() ? email.trim() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowAddModal(false);
      setFullName('');
      setPhone('');
      setEmail('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || (language === 'am' ? 'ግለሰቡን መፍጠር አልተቻለም' : 'Failed to create person.'));
    },
  });

  const people = data?.people || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
            {language === 'am' ? 'የግለሰቦች ማውጫ' : 'People Directory'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am' ? 'የተማሪዎች፣ የቤተሰብ መሪዎች እና አስተዳዳሪዎች ዋና መዝገብ።' : 'Normalized identity records across students, family leaders (dads/moms), and administrative accounts.'}
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> {language === 'am' ? 'አዲስ ግለሰብ መዝግብ' : 'Add Person'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={language === 'am' ? 'በስም፣ በስልክ ወይም በኢሜይል ፈልግ...' : 'Search by name, phone, or email...'}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {language === 'am' ? 'ድምር፡' : 'Total:'} <strong>{pagination.total}</strong> {language === 'am' ? 'ግለሰቦች' : 'people'}
        </div>
      </div>

      {/* People Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 dark:text-rose-400 text-sm">
            {language === 'am' ? 'የግለሰቦችን ማውጫ መጫን አልተቻለም።' : 'Failed to load people directory.'}
          </div>
        ) : people.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            {language === 'am' ? 'ምንም ግለሰብ አልተገኘም።' : 'No people records found matching your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#121A28] border-b border-slate-200 dark:border-[#29384E] text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">{t('studentName')}</th>
                  <th className="py-3 px-4">{t('phone')}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'የህብረት ሚናዎች' : 'Fellowship Roles'}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'የቤተሰብ ሚናዎች' : 'Family Roles'}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {people.map((p: any) => (
                  <tr key={p.personId} className="hover:bg-slate-50/80 dark:hover:bg-[#223045]/60 transition">
                    <td className="py-3 px-4">
                      <Link
                        to={`/people/${p.personId}`}
                        className="font-semibold text-slate-900 dark:text-[#F4F0E7] hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {p.fullName}
                      </Link>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">ID #{p.personId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone || '—'}</span>
                      </div>
                      {p.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.isStudent && (
                          <Link
                            to={`/students/${p.studentId}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                          >
                            <UserCheck className="w-3 h-3" /> {language === 'am' ? 'ተማሪ' : 'Student'}
                          </Link>
                        )}
                        {p.isAccount && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Shield className="w-3 h-3" /> {p.accountRole}
                          </span>
                        )}
                        {!p.isStudent && !p.isAccount && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.activeFamilyRoles && p.activeFamilyRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.activeFamilyRoles.map((role: any, idx: number) => (
                            <Link
                              key={idx}
                              to={`/families/${role.familyId}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                role.role === 'DAD' || role.role === 'MOM'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              <Award className="w-3 h-3" />
                              {role.role === 'DAD' ? t('dadRole') : role.role === 'MOM' ? t('momRole') : t('memberRole')} - {role.familyName}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">{language === 'am' ? 'የለም' : 'None'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/people/${p.personId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800"
                      >
                        {t('details')} <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-[#29384E] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              {language === 'am' ? 'ገጽ' : 'Page'} {pagination.page} {t('ofRecords')} {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#1A2536] text-slate-700 dark:text-[#F4F0E7] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045] disabled:opacity-40"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#1A2536] text-slate-700 dark:text-[#F4F0E7] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045] disabled:opacity-40"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={language === 'am' ? 'አዲስ ግለሰብ መዝግብ' : 'Add New Person Record'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPersonMutation.mutate();
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
              {formError}
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
              placeholder={language === 'am' ? 'ለምሳሌ፡ ሳሙኤል በቀለ' : 'e.g. Samuel Bekele'}
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
              placeholder="e.g. 0911234567"
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
              placeholder="e.g. samuel@example.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={createPersonMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createPersonMutation.isPending ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
