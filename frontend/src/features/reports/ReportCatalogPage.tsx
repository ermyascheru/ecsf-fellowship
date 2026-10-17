import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Users, School, Layers, 
  Activity, ShieldAlert, UserX, Award, FileSpreadsheet, FileCode 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

interface ReportCard {
  id: string;
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  icon: any;
  endpoint: string;
  category: string;
  categoryAm: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'family-summary',
    title: 'Family Summary Report',
    titleAm: 'የቤተሰቦች አጠቃላይ ሪፖርት',
    description: 'Comprehensive roster of all fellowship families with leader assignments, capacity targets, current members, and health status.',
    descriptionAm: 'የሁሉም የህብረት ቤተሰቦች መሪዎች፣ የአቅም ገደብ፣ የአሁን አባላት ብዛት እና የጤና ሁኔታ አጠቃላይ ዝርዝር።',
    icon: Users,
    endpoint: 'family-summary',
    category: 'Families',
    categoryAm: 'ቤተሰቦች',
  },
  {
    id: 'students',
    title: 'Student Roster & Profiles',
    titleAm: 'የተማሪዎች ሙሉ ማውጫ እና መገለጫ',
    description: 'Complete student directory with university ID, department, academic stage, GC status, family membership, and participation.',
    descriptionAm: 'የተማሪዎች ዩኒቨርሲቲ መታወቂያ፣ ዲፓርትመንት፣ የትምህርት ደረጃ፣ የተመራቂነት ሁኔታ እና የቤተሰብ ምደባ ሙሉ ዝርዝር።',
    icon: School,
    endpoint: 'students',
    category: 'Students',
    categoryAm: 'ተማሪዎች',
  },
  {
    id: 'academic-stages',
    title: 'Academic Stages & GC Distribution',
    titleAm: 'የትምህርት እርከኖች እና ተመራቂዎች ክፍፍል',
    description: 'Breakdown of students by academic year stage (Remedial to Year 5) cross-referenced with independent Graduating Class classification.',
    descriptionAm: 'የተማሪዎች ክፍፍል በትምህርት ዓመት (ከሬሜዲያል እስከ 5ኛ ዓመት) ከተመራቂነት ምድብ ጋር ተነጻጽሮ የቀረበ።',
    icon: Layers,
    endpoint: 'academic-stages',
    category: 'Academics',
    categoryAm: 'ትምህርት',
  },
  {
    id: 'departments',
    title: 'Department Distribution',
    titleAm: 'የዲፓርትመንት ክፍፍል',
    description: 'Student counts and active participation metrics grouped across all campus university academic departments.',
    descriptionAm: 'በሁሉም የግቢው የትምህርት ክፍሎች (ዲፓርትመንቶች) ያሉ ተማሪዎች ቁጥር እና የንቁ ተሳትፎ ምጣኔ።',
    icon: School,
    endpoint: 'departments',
    category: 'Academics',
    categoryAm: 'ትምህርት',
  },
  {
    id: 'participation',
    title: 'Participation & Engagement',
    titleAm: 'የህብረት ተሳትፎ እና ንቅናቄ',
    description: 'Analysis of Active vs Inactive fellowship attendance, filtering students by campus engagement and contact details.',
    descriptionAm: 'የንቁ እና ያልተሳተፉ ተማሪዎች ንጽጽር ትንታኔ እና የአድራሻ መረጃዎች።',
    icon: Activity,
    endpoint: 'participation',
    category: 'Fellowship',
    categoryAm: 'ህብረት',
  },
  {
    id: 'family-capacity',
    title: 'Family Capacity & Overrides',
    titleAm: 'የቤተሰቦች አቅም እና ልዩ ማለፊያዎች',
    description: 'Capacity utilization metrics, families at or exceeding targets, and audit trail of manual capacity override transactions.',
    descriptionAm: 'የቤተሰቦች የአቅም አጠቃቀም፣ አቅማቸው የሞላ ክፍሎች እና የተፈቀዱ ልዩ የአቅም ማለፊያዎች መዝገብ።',
    icon: ShieldAlert,
    endpoint: 'family-capacity',
    category: 'Governance',
    categoryAm: 'አስተዳደር',
  },
  {
    id: 'unassigned-students',
    title: 'Unassigned Students',
    titleAm: 'ያልተመደቡ ተማሪዎች',
    description: 'Actionable list of enrolled students who currently have no active family placement or whose membership was terminated.',
    descriptionAm: 'በአሁኑ ሰዓት በማንኛውም የህብረት ቤተሰብ ውስጥ ያልተመደቡ የተመዘገቡ ተማሪዎች ዝርዝር።',
    icon: UserX,
    endpoint: 'unassigned-students',
    category: 'Students',
    categoryAm: 'ተማሪዎች',
  },
  {
    id: 'leadership-history',
    title: 'Leadership Roster & History',
    titleAm: 'የመሪዎች ታሪክ እና የአገልግሎት ዘመን',
    description: 'Historical and current record of family Dads and Moms, service start/end dates, and multi-family service records.',
    descriptionAm: 'የአባቶች እና እናቶች የአሁን እና ያለፈ የአገልግሎት ዘመን እና የቤተሰብ ታሪክ።',
    icon: Award,
    endpoint: 'leadership-history',
    category: 'Families',
    categoryAm: 'ቤተሰቦች',
  },
];

export const ReportCatalogPage: React.FC = () => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const handleExport = async (reportEndpoint: string, format: 'csv' | 'excel' | 'pdf') => {
    try {
      setDownloadingId(`${reportEndpoint}-${format}`);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportEndpoint}/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `${reportEndpoint}_report.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`${language === 'am' ? 'ሪፖርቱን ማውረድ አልተቻለም' : 'Export failed for format'} ${format.toUpperCase()}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
          {t('reportsTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('reportsSubtitle')}
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm flex flex-col justify-between hover:shadow-md transition duration-200 p-6"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-[#121A28] text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-[#29384E]">
                    {language === 'am' ? card.categoryAm : card.category}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F0E7] mb-2">
                  {language === 'am' ? card.titleAm : card.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {language === 'am' ? card.descriptionAm : card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#29384E] flex flex-col gap-2">
                <Link
                  to={`/reports/${card.endpoint}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t('viewInteractiveReport')}
                </Link>

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('export')}:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExport(card.endpoint, 'pdf')}
                      disabled={downloadingId === `${card.endpoint}-pdf`}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#121A28] hover:bg-slate-200 dark:hover:bg-[#223045] rounded transition flex items-center gap-1 disabled:opacity-50 border border-slate-200/50 dark:border-[#29384E]"
                      title="Download PDF"
                    >
                      <FileText className="w-3 h-3 text-rose-600" /> PDF
                    </button>
                    <button
                      onClick={() => handleExport(card.endpoint, 'excel')}
                      disabled={downloadingId === `${card.endpoint}-excel`}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#121A28] hover:bg-slate-200 dark:hover:bg-[#223045] rounded transition flex items-center gap-1 disabled:opacity-50 border border-slate-200/50 dark:border-[#29384E]"
                      title="Download Excel"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Excel
                    </button>
                    <button
                      onClick={() => handleExport(card.endpoint, 'csv')}
                      disabled={downloadingId === `${card.endpoint}-csv`}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#121A28] hover:bg-slate-200 dark:hover:bg-[#223045] rounded transition flex items-center gap-1 disabled:opacity-50 border border-slate-200/50 dark:border-[#29384E]"
                      title="Download CSV"
                    >
                      <FileCode className="w-3 h-3 text-blue-600" /> CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
