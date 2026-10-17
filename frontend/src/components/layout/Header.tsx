import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Menu, LogOut, Shield, BookOpen, 
  HeartHandshake, Users, FileText, ArrowRight, Loader2, X,
  Globe 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

interface SearchResponse {
  query: string;
  students: Array<{
    studentId: number;
    universityStudentId: string | null;
    fullName: string;
    phone: string;
    departmentName: string | null;
    academicStage: string | null;
    familyName: string | null;
    participationStatus: string;
  }>;
  families: Array<{
    familyId: number;
    familyCode: string;
    familyName: string;
    memberCapacity: number;
    activeMemberCount: number;
    capacityStatus: string;
  }>;
  people: Array<{
    personId: number;
    fullName: string;
    phone: string;
    email: string | null;
    studentId: number | null;
    familyRoles: string[];
    accountRole: string | null;
  }>;
  pages: Array<{
    title: string;
    category: string;
    path: string;
    description: string;
  }>;
  totalResults: number;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Profile dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q } });
        setSearchResults(res.data);
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults && searchResults.students.length > 0) {
      navigate(`/students/${searchResults.students[0].studentId}`);
    } else {
      navigate(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
    }
    setIsSearchOpen(false);
  };

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white dark:bg-[#1A2536] border-b border-slate-200 dark:border-[#29384E] shadow-sm transition-colors duration-200">
      {/* Left: Mobile Menu & Live Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl relative" ref={searchContainerRef}>
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-slate-500 dark:text-slate-400 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-[#202C3D] focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input Container */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => {
              if (searchResults && searchResults.totalResults > 0) {
                setIsSearchOpen(true);
              }
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'am' ? 'ተማሪዎችን፣ ቤተሰቦችን፣ ወይም ሪፖርቶችን ፈልግ...' : 'Search students, families, reports, or pages...'}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-[#121A28] border border-slate-200 dark:border-[#29384E] rounded-lg text-sm text-slate-800 dark:text-[#F4F0E7] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-[#121A28] transition-all"
          />

          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
          )}

          {!isSearching && searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Live Search Results Dropdown Overlay */}
        {isSearchOpen && searchResults && (
          <div className="absolute left-0 right-0 top-12 mt-1 bg-white dark:bg-[#1A2536] rounded-xl shadow-2xl border border-slate-200 dark:border-[#29384E] py-2 z-50 max-h-[500px] overflow-y-auto">
            {searchResults.totalResults === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                {language === 'am' ? 'ምንም መረጃ አልተገኘም ለ ' : 'No matching records found for '}
                <strong className="text-slate-800 dark:text-white">"{searchQuery}"</strong>.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#29384E] text-xs">
                {/* Students Section */}
                {searchResults.students.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      {t('navStudents')} ({searchResults.students.length})
                    </div>
                    {searchResults.students.map((stu) => (
                      <div
                        key={stu.studentId}
                        onClick={() => handleResultClick(`/students/${stu.studentId}`)}
                        className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#202C3D] cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] group-hover:text-blue-600 transition">
                              {stu.fullName}
                            </span>
                            {stu.universityStudentId && (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#121A28] px-1.5 py-0.5 rounded">
                                {stu.universityStudentId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {stu.departmentName} &bull; {stu.academicStage || 'No stage'} &bull; {stu.familyName || t('unassigned')}
                          </div>
                        </div>
                        <Badge status={stu.participationStatus} size="sm" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Families Section */}
                {searchResults.families.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" />
                      {t('navFamilies')} ({searchResults.families.length})
                    </div>
                    {searchResults.families.map((fam) => (
                      <div
                        key={fam.familyId}
                        onClick={() => handleResultClick(`/families/${fam.familyId}`)}
                        className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#202C3D] cursor-pointer flex items-center justify-between transition group"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] group-hover:text-blue-600 transition">
                            {fam.familyName}
                          </span>
                          <span className="ml-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            ({fam.familyCode})
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {fam.activeMemberCount} / {fam.memberCapacity} {language === 'am' ? 'አባላት' : 'members'}
                          </span>
                        </div>
                        <Badge status={fam.capacityStatus} size="sm" />
                      </div>
                    ))}
                  </div>
                )}

                {/* People Records Section */}
                {searchResults.people.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      {language === 'am' ? 'የግለሰቦች መዝገብ' : 'People Directory'} ({searchResults.people.length})
                    </div>
                    {searchResults.people.map((p) => (
                      <div
                        key={p.personId}
                        onClick={() => handleResultClick(`/people/${p.personId}`)}
                        className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#202C3D] cursor-pointer flex items-center justify-between transition group"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] group-hover:text-blue-600 transition">
                            {p.fullName}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {p.phone} {p.email ? `• ${p.email}` : ''}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {p.accountRole && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                              {p.accountRole}
                            </span>
                          )}
                          {p.familyRoles.map((role, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pages & Reports Section */}
                {searchResults.pages.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      {t('navReports')} & {t('settingsTitle')}
                    </div>
                    {searchResults.pages.map((pg, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleResultClick(pg.path)}
                        className="px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#202C3D] cursor-pointer flex items-center justify-between transition group"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-[#F4F0E7] group-hover:text-blue-600 transition">
                            {pg.title}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {pg.description}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#121A28] text-slate-600 dark:text-slate-400 font-medium">
                          {pg.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer link to view full student search results */}
                <div className="p-2.5 bg-slate-50 dark:bg-[#121A28] rounded-b-xl flex justify-between items-center px-4">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('showingRecords')} <strong>{searchResults.totalResults}</strong> {t('records')}
                  </span>
                  <button
                    onClick={() => {
                      navigate(`/students?search=${encodeURIComponent(searchQuery)}`);
                      setIsSearchOpen(false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    {t('viewAll')} &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Language Selector, Theme Toggle & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#29384E] bg-slate-50 dark:bg-[#121A28] hover:bg-slate-100 dark:hover:bg-[#202C3D] text-slate-700 dark:text-[#F4F0E7] text-xs font-semibold transition"
          title={language === 'en' ? 'ወደ አማርኛ ቀይር' : 'Switch to English'}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'en' ? 'አማርኛ' : 'EN'}</span>
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#202C3D] transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#172B4D] dark:bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-[#F4F0E7] leading-tight">
                {user?.fullName || 'Admin User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {user?.role === 'ADMIN' ? t('adminRole') : t('leaderRole')}
              </p>
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1A2536] rounded-xl shadow-xl border border-slate-100 dark:border-[#29384E] py-1.5 z-50 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[#29384E]">
                <p className="text-xs font-semibold text-slate-800 dark:text-[#F4F0E7]">{user?.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || user?.username}</p>
              </div>

              <div className="px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>{user?.role === 'ADMIN' ? t('adminRole') : t('leaderRole')}</span>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors font-medium text-xs border-t border-slate-50 dark:border-[#29384E] mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
