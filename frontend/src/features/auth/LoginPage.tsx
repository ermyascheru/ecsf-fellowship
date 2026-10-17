import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Eye, EyeOff, AlertCircle, Globe } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { FellowshipSidebar } from '../../components/common/FellowshipSidebar.js';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || (language === 'am' ? 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል። እባክዎ እንደገና ይሞክሩ።' : 'Invalid credentials. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Brand Panel: Exactly 50% width, meeting at the center */}
      <div className="w-full md:w-1/2 flex-shrink-0">
        <FellowshipSidebar />
      </div>

      {/* Right Login Card Panel: Exactly 50% width, meeting at the center */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 bg-[#F8FAFC] relative min-h-screen">
        {/* Top Right Language Toggle */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            title={language === 'en' ? 'ወደ አማርኛ ቀይር' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-[#172B4D]" />
            <span>{language === 'en' ? 'አማርኛ' : 'EN'}</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-2xl border border-slate-200 shadow-sm transition-colors duration-200">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {t('loginWelcome')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('loginPrompt')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                {t('username')}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'am' ? 'የተጠቃሚ ስምዎን ያስገቡ' : 'Enter your username'}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#172B4D]/25 focus:border-[#172B4D] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'am' ? 'የይለፍ ቃልዎን ያስገቡ' : 'Enter your password'}
                  className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#172B4D]/25 focus:border-[#172B4D] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#172B4D] hover:bg-[#203B58] text-white font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{t('securityNotice')}</span>
          </div>

          {/* Quick Demo Access */}
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <p className="font-semibold mb-1 text-slate-800">{t('demoQuickAccess')}:</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('admin_samuel', 'Admin@123')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#172B4D] font-semibold rounded border border-slate-300 transition-colors shadow-2xs"
              >
                Admin (admin_samuel)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('leader_ruth', 'Leader@123')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#172B4D] font-semibold rounded border border-slate-300 transition-colors shadow-2xs"
              >
                Leader (leader_ruth)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
