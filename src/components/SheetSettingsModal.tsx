import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle2,
  Sun,
  Moon,
  AlertCircle,
  Unlink
} from 'lucide-react';
import { SpreadsheetInfo, Habit, HabitLog } from '../types';
import { ThemeMode } from '../hooks/useTheme';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  spreadsheetInfo: SpreadsheetInfo | null;
  userEmail?: string | null;
  syncError?: string | null;
  isSyncing: boolean;
  habits: Habit[];
  logs: HabitLog[];
  onManualSync: () => Promise<void>;
  onCreateNewSheet: () => Promise<void>;
  onConnectCustomId: (id: string) => Promise<void>;
  onDisconnectSheet: () => void;
  onImportBackup: (habits: Habit[], logs: HabitLog[]) => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  spreadsheetInfo,
  userEmail,
  syncError,
  isSyncing,
  habits: _habits,
  logs: _logs,
  onManualSync,
  onCreateNewSheet: _onCreateNewSheet,
  onConnectCustomId: _onConnectCustomId,
  onDisconnectSheet,
  onImportBackup: _onImportBackup,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sheetUrl = spreadsheetInfo?.id
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetInfo.id}/edit${
        userEmail ? `?authuser=${encodeURIComponent(userEmail)}` : ''
      }`
    : '';

  const handleCopyLink = () => {
    if (!sheetUrl) return;
    navigator.clipboard.writeText(sheetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">
              إعدادات التطبيق ومزامنة Google Sheets
            </h3>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {syncError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <p>{syncError}</p>
          </div>
        )}

        {/* Appearance / Theme Toggle Section */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            onClick={onToggleTheme}
            className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition-colors cursor-pointer p-1 ${
              theme === 'light'
                ? 'bg-emerald-600 border-emerald-500 justify-start'
                : 'bg-slate-800 border-slate-700 justify-end'
            }`}
            title={theme === 'light' ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح'}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900 shadow-md transition-transform">
              {theme === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
            </span>
          </button>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-sm font-bold text-slate-100">
              <span>{theme === 'light' ? 'الوضع الفاتح (Light Mode)' : 'الوضع الداكن (Dark Mode)'}</span>
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              بدّل بين الخلفية الداكنة والوضع الفاتح المريح للعين في أي وقت
            </p>
          </div>
        </div>

        {/* Current Sheet Card */}
        {spreadsheetInfo?.id ? (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>متصل بنجاح</span>
              </span>
              <h4 className="text-sm font-bold text-slate-200">
                {spreadsheetInfo.title || 'جدول متتبع العادات'}
              </h4>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                  title="نسخ رابط الجدول"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <span>فتح في نافذة جديدة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <span className="font-mono text-slate-400 truncate max-w-[200px]" dir="ltr">
                {spreadsheetInfo.id}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'جارِ المزامنة...' : 'مزامنة البيانات الآن'}</span>
                </button>

                <button
                  type="button"
                  onClick={onDisconnectSheet}
                  disabled={isSyncing}
                  title="فصل الجدول الحالي لإصلاح الربط أو إنشاء جدول جديد"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>فصل الجدول</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                آخر مزامنة: {spreadsheetInfo.lastSyncedAt ? new Date(spreadsheetInfo.lastSyncedAt).toLocaleTimeString('ar-EG') : 'منذ لحظات'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right space-y-2">
            <h4 className="text-sm font-bold text-amber-300">لم يتم ربط جدول بعد</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              يمكنك إنشاء جدول بيانات جديد بنقرة واحدة ليتم حفظ كل عاداتك وسجل التزامك فيه تلقائياً.
            </p>
          </div>
        )}

        {/* Explain tabs */}
        <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
            <li><strong>ورقة العادات (العادات_Habits):</strong> قائمة العادات والهدف الأسبوعي.</li>
            <li><strong>ورقة السجل (السجل_Logs):</strong> كل إنجاز مع التاريخ والملاحظات والوقت.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
