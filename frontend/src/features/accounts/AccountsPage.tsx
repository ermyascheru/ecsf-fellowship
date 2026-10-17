import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Modal } from '../../components/common/Modal.js';
import { 
  Shield, UserPlus, ShieldAlert 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

export const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  const [showAddModal, setShowAddModal] = useState(false);
  const [personId, setPersonId] = useState<number | ''>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'FELLOWSHIP_LEADER'>('FELLOWSHIP_LEADER');
  const [formError, setFormError] = useState('');

  // Family Access Modal
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | ''>('');
  const [accessError, setAccessError] = useState('');

  // Fetch accounts
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data.accounts;
    },
    enabled: user?.role === 'ADMIN',
  });

  // Fetch people for dropdown
  const { data: peopleData } = useQuery({
    queryKey: ['people-dropdown'],
    queryFn: async () => {
      const res = await api.get('/people?limit=100');
      return res.data.people;
    },
    enabled: showAddModal,
  });

  // Fetch families for dropdown
  const { data: familiesData } = useQuery({
    queryKey: ['families-dropdown'],
    queryFn: async () => {
      const res = await api.get('/families');
      return res.data.families;
    },
    enabled: !!selectedAccount,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounts', {
        personId: Number(personId),
        username,
        password,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowAddModal(false);
      setPersonId('');
      setUsername('');
      setPassword('');
      setRole('FELLOWSHIP_LEADER');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || (language === 'am' ? 'የህብረት መለያ መፍጠር አልተቻለም' : 'Failed to create fellowship account.'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ accountId, isActive }: { accountId: number; isActive: boolean }) => {
      await api.patch(`/accounts/${accountId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || (language === 'am' ? 'የመለያውን ሁኔታ መቀየር አልተቻለም' : 'Failed to update account status.'));
    },
  });

  const assignFamilyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/accounts/${selectedAccount.accountId}/family-access`, {
        familyId: Number(selectedFamilyId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedFamilyId('');
      setAccessError('');
    },
    onError: (err: any) => {
      setAccessError(err.response?.data?.error || (language === 'am' ? 'የቤተሰብ መዳረሻን መስጠት አልተቻለም' : 'Failed to assign family access.'));
    },
  });

  const removeFamilyMutation = useMutation({
    mutationFn: async ({ accountId, familyId }: { accountId: number; familyId: number }) => {
      await api.delete(`/accounts/${accountId}/family-access/${familyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || (language === 'am' ? 'የቤተሰብ መዳረሻን ማስወገድ አልተቻለም' : 'Failed to remove family access.'));
    },
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-8 rounded-xl max-w-lg mx-auto my-12 text-center border border-rose-200 dark:border-rose-800">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold">{t('accessRestricted')}</h2>
        <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
          {language === 'am' ? 'የተጠቃሚ መለያዎችን ለማስተዳደር ፈቃድ የተሰጣቸው አስተዳዳሪዎች ብቻ ናቸው።' : 'Only fellowship administrators hold authorization to view and manage login accounts.'}
        </p>
      </div>
    );
  }

  const accounts = data || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
            {t('accountsTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('accountsSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> {t('createAccount')}
        </button>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-300 text-xs flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">{language === 'am' ? 'የደህንነት መመሪያ ማሳሰቢያ፡' : 'Security Policy Notice:'}</p>
          <p className="text-blue-700 dark:text-blue-300/80 mt-0.5">
            {language === 'am' ? 'የመግቢያ መለያ የሚሰጣቸው አስተዳዳሪዎች እና የህብረት መሪዎች ብቻ ናቸው። የቤተሰብ አባቶች፣ እናቶች እና መደበኛ ተማሪዎች የመግቢያ መለያ አያስፈልጋቸውም።' : 'Only designated Administrators and Fellowship Leaders have login accounts. Family Dads, Moms, and regular student members do not log in.'}
          </p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 dark:text-rose-400 text-sm">
            {language === 'am' ? 'መለያዎችን መጫን አልተቻለም። እባክዎ ምስክርነትዎን ያረጋግጡ።' : 'Failed to load accounts. Please check your credentials.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#121A28] border-b border-slate-200 dark:border-[#29384E] text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">{t('username')}</th>
                  <th className="py-3 px-4">{t('systemRole')}</th>
                  <th className="py-3 px-4">{t('phone')}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'የሚተዳደሩ ቤተሰቦች' : 'Scoped Families'}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4">{t('lastLogin')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {accounts.map((acc: any) => (
                  <tr key={acc.accountId} className="hover:bg-slate-50/80 dark:hover:bg-[#223045]/60 transition">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] block font-mono">@{acc.username}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{acc.fullName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold ${
                        acc.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {acc.role === 'ADMIN' ? t('adminRole') : t('leaderRole')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div>{acc.phone || '—'}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-400">{acc.email || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      {acc.role === 'ADMIN' ? (
                        <span className="text-slate-400 dark:text-slate-500 italic">{language === 'am' ? 'የሙሉ ግቢው መዳረሻ አለው' : 'Full Campus Access'}</span>
                      ) : acc.assignedFamilies && acc.assignedFamilies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {acc.assignedFamilies.map((fam: any) => (
                            <span
                              key={fam.family_id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#121A28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#29384E]"
                            >
                              {fam.family_name}
                              <button
                                onClick={() => removeFamilyMutation.mutate({ accountId: acc.accountId, familyId: fam.family_id })}
                                className="text-slate-400 hover:text-rose-600 ml-0.5"
                                title="Remove access"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-[11px]">{language === 'am' ? 'የተመደበ ቤተሰብ የለም' : 'No scoped families'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        acc.isActive ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {acc.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : (language === 'am' ? 'በፍጹም አልገባም' : 'Never')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {acc.role === 'FELLOWSHIP_LEADER' && (
                          <button
                            onClick={() => {
                              setSelectedAccount(acc);
                              setAccessError('');
                              setSelectedFamilyId('');
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition border border-blue-200 dark:border-blue-900/40"
                          >
                            {language === 'am' ? 'ቤተሰብ መድብ' : 'Assign Family'}
                          </button>
                        )}
                        {acc.accountId !== user?.accountId && (
                          <button
                            onClick={() => toggleStatusMutation.mutate({ accountId: acc.accountId, isActive: !acc.isActive })}
                            disabled={toggleStatusMutation.isPending}
                            className={`px-2 py-1 text-[11px] font-medium rounded transition border ${
                              acc.isActive
                                ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800'
                                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {acc.isActive ? (language === 'am' ? 'አቦዝን' : 'Disable') : (language === 'am' ? 'አንቃ' : 'Enable')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('createAccount')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAccountMutation.mutate();
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
              {language === 'am' ? 'የግለሰቡ መዝገብ' : 'Person Record'} <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- {language === 'am' ? 'ከማውጫው ግለሰብ ይምረጡ' : 'Select individual from directory...'} --</option>
              {peopleData?.map((p: any) => (
                <option key={p.personId} value={p.personId}>
                  {p.fullName} ({p.phone}) #{p.personId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('username')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. leader_ruth"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('password')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder={language === 'am' ? 'ቢያንስ 6 ፊደላት ወይም ቁጥሮች' : 'Minimum 6 characters'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('systemRole')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="FELLOWSHIP_LEADER">{t('leaderRole')} ({language === 'am' ? 'የቤተሰብ መሪ መዳረሻ' : 'Family leader access'})</option>
              <option value="ADMIN">{t('adminRole')} ({language === 'am' ? 'ሙሉ የአስተዳዳሪ መዳረሻ' : 'Full administrative access'})</option>
            </select>
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
              disabled={createAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createAccountMutation.isPending ? t('loading') : t('createAccount')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Family Access Modal */}
      {selectedAccount && (
        <Modal
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          title={`${language === 'am' ? 'የቤተሰብ መዳረሻ ፍቃድ ስጥ ለ @' : 'Assign Family Access to @'}${selectedAccount.username}`}
        >
          <div className="space-y-4">
            {accessError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded border border-rose-200 dark:border-rose-800">
                {accessError}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'am' ? 'ለ' : 'Grant'} <strong>{selectedAccount.fullName}</strong> {language === 'am' ? 'የቤተሰብ አስተዳደር መዳረሻ ፍቃድ ይስጡ።' : 'management access to a fellowship family unit.'}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {language === 'am' ? 'ቤተሰብ ይምረጡ' : 'Select Family'}
              </label>
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] p-2.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- {language === 'am' ? 'ቤተሰብ ይምረጡ' : 'Choose family to assign...'} --</option>
                {familiesData?.map((fam: any) => (
                  <option key={fam.familyId} value={fam.familyId}>
                    {fam.familyName} ({fam.familyCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#29384E]">
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045]"
              >
                {t('close')}
              </button>
              <button
                type="button"
                onClick={() => assignFamilyMutation.mutate()}
                disabled={assignFamilyMutation.isPending || !selectedFamilyId}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {assignFamilyMutation.isPending ? t('loading') : (language === 'am' ? 'መዳረሻውን ፍቀድ' : 'Assign Access')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
