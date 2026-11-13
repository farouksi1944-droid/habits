import React from 'react';
import { FileSpreadsheet, ShieldCheck, Zap, CloudCheck, Sparkles } from 'lucide-react';

interface GoogleSignInCardProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  onContinueOffline?: () => void;
  error?: string | null;
}

export const GoogleSignInCard: React.FC<GoogleSignInCardProps> = ({
  onSignIn,
  isLoading,
  onContinueOffline,
  error,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto my-8 p-8 bg-slate-900/90 border border-emerald-500/20 rounded-3xl shadow-2xl backdrop-blur-md text-right relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ربط مباشر مع Google Sheets</span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            مُتتبّع العادات الذكي المتصل بـ Google Sheets
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            سجّل عاداتك والتزامك اليومي بسهولة، مع حفظ ومزامنة فورية لكل إنجاز في جدول بيانات Google Sheets خاص بك على حسابك في Google Drive.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-end gap-1.5 text-emerald-400 text-xs font-bold">
              <span>مزامنة فورية</span>
              <CloudCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-slate-400">تحديث فوري لجدول البيانات مع كل علامة صح</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-end gap-1.5 text-blue-400 text-xs font-bold">
              <span>بياناتك ملكك</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-slate-400">تُخزن كامل سجلاتك في حسابك على Google</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-end gap-1.5 text-amber-400 text-xs font-bold">
              <span>تحليلات ذكية</span>
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-slate-400">إحصائيات سلاسل الالتزام ومعدل الإنجاز</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Official Google Sign-in button styling */}
          <button
            type="button"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-[#ffffff] hover:bg-[#f8fafc] text-[#1e293b] border border-[#e2e8f0] font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span className="text-sm">
              {isLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول بحساب Google للربط'}
            </span>
          </button>

          {onContinueOffline && (
            <button
              type="button"
              onClick={onContinueOffline}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
            >
              المتابعة محلياً في المتصفح أولاً
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
