import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api.js';
import { Badge } from '../../components/common/Badge.js';
import { 
  ArrowLeft, Printer, Search, 
  FileText, FileSpreadsheet, FileCode, RefreshCw 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.js';

interface ReportMeta {
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  endpoint: string;
}

const REPORT_CONFIGS: Record<string, ReportMeta> = {
  'family-summary': {
    title: 'Family Summary Report',
    titleAm: 'የቤተሰቦች አጠቃላይ ሪፖርት',
    description: 'Overview of all families, leadership roster, member capacity, and health status.',
    descriptionAm: 'የሁሉም ቤተሰቦች አጠቃላይ እይታ፣ የመሪዎች መዝገብ፣ የአባላት አቅም እና የጤና ሁኔታ።',
    endpoint: 'family-summary',
  },
  'students': {
    title: 'Student Roster & Directory',
    titleAm: 'የተማሪዎች ሙሉ ማውጫ',
    description: 'Comprehensive student records, university IDs, academic stage, GC status, and participation.',
    descriptionAm: 'የተማሪዎች ሙሉ መዝገብ፣ የዩኒቨርሲቲ መታወቂያ፣ የትምህርት እርከን፣ የተመራቂነት ሁኔታ እና ተሳትፎ።',
    endpoint: 'students',
  },
  'academic-stages': {
    title: 'Students by Academic Stage',
    titleAm: 'የተማሪዎች ክፍፍል በትምህርት ደረጃ',
    description: 'Breakdown of student body across academic years (Remedial Year 0 to Senior Years).',
    descriptionAm: 'የተማሪዎች ክፍፍል በትምህርት ዓመታት (ከሬሜዲያል እስከ ከፍተኛ ዓመታት)።',
    endpoint: 'academic-stages',
  },
  'departments': {
    title: 'Students by University Department',
    titleAm: 'ተማሪዎች በዩኒቨርሲቲ ዲፓርትመንት',
    description: 'Distribution of students and engagement levels across university faculties.',
    descriptionAm: 'በዩኒቨርሲቲው ፋኩልቲዎች እና ክፍሎች ያሉ ተማሪዎች ስርጭት እና የተሳትፎ መጠን።',
    endpoint: 'departments',
  },
  'participation': {
    title: 'Fellowship Participation Report',
    titleAm: 'የህብረት ተሳትፎ ሪፖርት',
    description: 'Student fellowship engagement metrics, active vs inactive participation list.',
    descriptionAm: 'የተማሪዎች የህብረት ተሳትፎ መለኪያ፣ የንቁ እና ያልተሳተፉ ተማሪዎች ዝርዝር።',
    endpoint: 'participation',
  },
  'family-capacity': {
    title: 'Family Capacity & Overrides Report',
    titleAm: 'የቤተሰቦች አቅም እና ልዩ ማለፊያዎች ሪፖርት',
    description: 'Detailed analysis of family capacity ceilings, space availability, and capacity status.',
    descriptionAm: 'የቤተሰቦች ከፍተኛ የአቅም ገደብ፣ ክፍት ቦታዎች እና የአቅም ሁኔታ ዝርዝር ትንታኔ።',
    endpoint: 'family-capacity',
  },
  'unassigned-students': {
    title: 'Unassigned Students Report',
    titleAm: 'ያልተመደቡ ተማሪዎች ሪፖርት',
    description: 'Registered fellowship students currently not assigned to any active family unit.',
    descriptionAm: 'በአሁኑ ሰዓት በማንኛውም የህብረት ቤተሰብ ውስጥ ያልተመደቡ የተመዘገቡ ተማሪዎች።',
    endpoint: 'unassigned-students',
  },
  'gc-classification': {
    title: 'Graduating Class (GC) Designation',
    titleAm: 'የተመራቂነት (GC) ምድብ ሪፖርት',
    description: 'Students grouped by independent GC classification status.',
    descriptionAm: 'ተማሪዎች በተናጠል የተመራቂነት ምድብ ሁኔታቸው ተለይተው የቀረቡበት።',
    endpoint: 'gc-classification',
  },
  'leadership-history': {
    title: 'Family Leadership History Report',
    titleAm: 'የቤተሰብ መሪዎች ታሪክ ሪፖርት',
    description: 'Historical and current assignments of Family Dads and Moms.',
    descriptionAm: 'የቤተሰብ አባቶች እና እናቶች ያለፈ እና የአሁን የአገልግሎት ምደባ።',
    endpoint: 'leadership-history',
  },
  'transfer-history': {
    title: 'Transfer Request & Audit History',
    titleAm: 'የዝውውር ጥያቄዎች እና የኦዲት ታሪክ',
    description: 'Full log of all student family transfer applications, approvals, and overrides.',
    descriptionAm: 'የሁሉም የተማሪዎች የቤተሰብ ዝውውር ማመልከቻዎች፣ ማጽደቆች እና ልዩ ማለፊያዎች ሙሉ መዝገብ።',
    endpoint: 'transfer-history',
  },
};

export const ReportPreviewPage: React.FC<{ forcedType?: string }> = ({ forcedType }) => {
  const { type: paramType } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const reportType = forcedType || paramType || 'family-summary';
  const config = REPORT_CONFIGS[reportType] || {
    title: 'Fellowship Report',
    titleAm: 'የህብረት ሪፖርት',
    description: 'Generated fellowship data view.',
    descriptionAm: 'የተዘጋጀ የህብረት መረጃ እይታ።',
    endpoint: reportType,
  };

  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report', reportType],
    queryFn: async () => {
      const res = await api.get(`/reports/${config.endpoint}`);
      return res.data;
    },
  });

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setDownloading(format);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${config.endpoint}/export?format=${format}`, {
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
      a.download = `${config.endpoint}_report_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`${language === 'am' ? 'ሪፖርቱን ማውረድ አልተቻለም' : 'Export failed for format'} ${format.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  const rows: any[] = data?.data || (Array.isArray(data) ? data : []);

  // Filter rows based on search
  const filteredRows = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((val) => 
      val !== null && val !== undefined && String(val).toLowerCase().includes(q)
    );
  });

  // Extract columns dynamically from first row if rows exist
  const sample = rows.length > 0 ? rows[0] : null;
  const columns = sample
    ? Object.keys(sample).filter(
        (k) => !k.endsWith('_id') && !k.endsWith('Id')
      )
    : [];

  const formatHeader = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const renderCell = (key: string, val: any) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-400 dark:text-slate-500">—</span>;

    if (key.includes('status') || key === 'participation_status' || key === 'capacity_status') {
      return <Badge status={String(val)} />;
    }

    if (key.includes('_date') || key.includes('_at') || key === 'date') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    }

    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs">{t('yes')}</span>
      ) : (
        <span className="text-slate-500 dark:text-slate-400 text-xs">{t('no')}</span>
      );
    }

    return String(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F4F0E7] hover:bg-slate-100 dark:hover:bg-[#1A2536] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7]">
              {language === 'am' ? config.titleAm : config.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {language === 'am' ? config.descriptionAm : config.description}
            </p>
          </div>
        </div>

        {/* Action Buttons: Refresh, Print, Exports */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045] shadow-sm transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t('refresh')}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1A2536] border border-slate-300 dark:border-[#29384E] rounded-lg hover:bg-slate-50 dark:hover:bg-[#223045] shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t('print')}
          </button>

          <div className="h-6 w-px bg-slate-300 dark:bg-[#29384E] mx-1 hidden sm:block" />

          <button
            onClick={() => handleExport('pdf')}
            disabled={downloading === 'pdf'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={downloading === 'excel'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={downloading === 'csv'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            <FileCode className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">FTVTI ECSF Fellowship Management System</h1>
        <h2 className="text-lg font-semibold text-slate-700 mt-1">{language === 'am' ? config.titleAm : config.title}</h2>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* Summary Card if present (e.g. participation report) */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{t('statTotalStudents')}</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-[#F4F0E7] mt-1">{data.summary.total_students}</p>
          </div>
          <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold">{t('statActiveStudents')}</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.summary.active_students}</p>
          </div>
          <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{language === 'am' ? 'ያልተሳተፉ ተማሪዎች' : 'Inactive Students'}</span>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">{data.summary.inactive_students}</p>
          </div>
        </div>
      )}

      {/* Search Bar & Count */}
      <div className="bg-white dark:bg-[#1A2536] p-4 rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchReportPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-[#29384E] bg-white dark:bg-[#121A28] text-slate-800 dark:text-[#F4F0E7] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t('showingRecords')} <strong>{filteredRows.length}</strong> {t('ofRecords')} <strong>{rows.length}</strong> {t('records')}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-[#1A2536] rounded-xl border border-slate-200 dark:border-[#29384E] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 dark:text-rose-400 text-sm">
            {language === 'am' ? 'የሪፖርቱን መረጃ መጫን አልተቻለም። እባክዎ የበይነመረብ ግንኙነትዎን ወይም ፍቃድዎን ያረጋግጡ።' : 'Failed to load report data. Please check your network or user permissions.'}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            {language === 'am' ? 'ለዚህ ሪፖርት መስፈርት የተገኘ መረጃ የለም።' : 'No records found for this report criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#121A28] border-b border-slate-200 dark:border-[#29384E] text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">
                      {formatHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29384E]">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#223045]/60 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-4 text-slate-800 dark:text-[#F4F0E7]">
                        {renderCell(col, row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
