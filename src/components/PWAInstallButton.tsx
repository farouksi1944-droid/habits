import React, { useState } from 'react';
import {
  MonitorDown,
  X,
  Laptop,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Hide when already running as an installed standalone desktop/mobile app
  if (isInstalled) {
    return null;
  }

  const standaloneUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(standaloneUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="تثبيت التطبيق على الكمبيوتر للعمل بدون إنترنت"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-slate-100 text-xs font-bold transition-all cursor-pointer"
      >
        <MonitorDown className="w-4 h-4 text-emerald-400" />
        <span className="hidden lg:inline">
          {isInstallable ? 'تثبيت التطبيق الآن' : 'تثبيت للعمل بدون إنترنت'}
        </span>
        <span className="lg:hidden">تثبيت</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  تثبيت التطبيق على جهازك بدون إنترنت
                </h3>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  {isIOS ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>لتثبيت التطبيق على iPhone أو iPad:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <li>اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.</li>
                  <li>اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                {isInIframe && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <p>
                      أنت تشاهد التطبيق حالياً داخل إطار المعاينة. المتصفح يمنع تثبيت التطبيقات من داخل الإطارات؛ افتح التطبيق في نافذة مستقلة أولاً ليتم التثبيت فوراً.
                    </p>
                  </div>
                )}

                <p className="text-xs text-slate-300">
                  التطبيق يعمل كتطبيق ويب تقدمي (PWA) ولا يُحمّل كملف تنفيذي (`.exe`)، بل يُثبَّت مباشرة من متصفح <strong>Chrome</strong> أو <strong>Edge</strong> إلى سطح المكتب:
                </p>

                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <li>افتح التطبيق في نافذة متصفح مستقلة عبر الزر بالأسفل.</li>
                  <li>في النافذة الجديدة، اضغط على <strong>تثبيت التطبيق الآن</strong> أو على أيقونة التثبيت <strong>⊕</strong> في شريط العنوان (أو قائمة المتصفح ⋮ ← تثبيت التطبيق).</li>
                  <li>سيظهر التطبيق كبرنامج مستقل على سطح المكتب ويعمل بدون إنترنت!</li>
                </ol>

                {standaloneUrl && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <a
                      href={standaloneUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح في نافذة مستقلة للتثبيت</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>جميع تغييراتك تُحفظ تلقائياً على جهازك وتُزامَن مع Google Sheets فور عودة الإنترنت.</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
