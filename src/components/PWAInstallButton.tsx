import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, isInIframe, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    if (!showGuideModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showGuideModal]);

  // Automatically hide once running as an installed standalone app
  if (isInstalled) {
    return null;
  }

  const standaloneUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleClick = async () => {
    if (isPrompting) return;
    if (isInstallable) {
      setIsPrompting(true);
      try {
        const accepted = await install();
        if (!accepted) {
          setShowGuideModal(true);
        }
      } finally {
        setIsPrompting(false);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(standaloneUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard API may be blocked in restricted frames
    }
  };

  const modalContent =
    showGuideModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowGuideModal(false)}
          >
            <div
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right space-y-4"
              role="dialog"
              aria-modal="true"
              aria-label="تثبيت التطبيق على جهازك"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">
                    تثبيت التطبيق على سطح المكتب أو الهاتف
                  </h3>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {isIOS ? (
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <p className="text-xs text-slate-300">
                    لتثبيت التطبيق على جهاز <strong>iPhone</strong> أو <strong>iPad</strong>:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <li>افتح التطبيق في متصفح <strong>Safari</strong>.</li>
                    <li>اضغط على زر <strong>المشاركة (Share)</strong> في شريط المتصفح بالأسفل.</li>
                    <li>اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط <strong>إضافة</strong>.</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  {isInIframe && (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <p>
                        أنت تشاهد التطبيق داخل إطار المعاينة؛ افتحه في تبويب مستقل أولاً ليظهر خيار التثبيت مباشرة على هاتفك.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-300">
                    لتثبيت التطبيق على هاتف <strong>Android</strong>:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <li>افتح التطبيق في متصفح <strong>Chrome</strong> أو <strong>Edge</strong> (عبر الزر بالأسفل إن كنت في المعاينة).</li>
                    <li>اضغط على قائمة المتصفح <strong>⋮</strong> في الأعلى.</li>
                    <li>اختر <strong>تثبيت التطبيق (Install app)</strong> أو <strong>الإضافة إلى الشاشة الرئيسية</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  {isInIframe ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <p>
                        أنت تشاهد التطبيق حالياً داخل إطار المعاينة، والمتصفحات تمنع التثبيت من داخل الإطارات. افتح التطبيق في متصفح مستقل أولاً ليظهر زر التثبيت المباشر.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <p>
                        إذا ظهر شريط رمادي باسم الموقع بالأعلى، فهذا يعني أنك فتحته عبر <strong>اختصار متصفح</strong> وليس عبر <strong>التثبيت كتطبيق مستقل</strong>، أو أنك تستخدم رابط المعاينة المؤقت بدلاً من الرابط المنشور.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-300">
                    لتثبيته كـ <strong>برنامج مستقل تماماً على سطح المكتب</strong> (بدون شريط Chrome أو تبويبات):
                  </p>

                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    {isInIframe && (
                      <li>اضغط <strong>فتح في نافذة مستقلة للتثبيت</strong> بالأسفل (يفضّل استخدام الرابط المنشور للتطبيق).</li>
                    )}
                    <li>
                      اضغط على أيقونة التثبيت <strong>⊕</strong> في شريط العنوان في Chrome/Edge، أو من قائمة Chrome: <strong>⋮ ← البث والحفظ والمشاركة ← تثبيت الصفحة كتطبيق</strong>.
                    </li>
                    <li>
                      عند ظهور نافذة التأكيد، فعّل <strong>إنشاء اختصار على سطح المكتب</strong> ليفتح كبرنامج مستقل تماماً بدون شريط المتصفح.
                    </li>
                  </ol>
                </div>
              )}

              {standaloneUrl && !isIOS && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {isInIframe && (
                    <a
                      href={standaloneUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح في نافذة مستقلة للتثبيت</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className={`${isInIframe ? '' : 'flex-1 '}inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer`}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم نسخ رابط التطبيق</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ رابط التطبيق</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>يعمل التطبيق بسلاسة بعد التثبيت مع حفظ تلقائي لعاداتك وسجلاتك حتى بدون إنترنت.</span>
              </div>

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
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPrompting}
        title="تثبيت التطبيق على سطح المكتب أو الهاتف للعمل كتطبيق مستقل"
        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        {isMobile ? (
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <MonitorDown className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span className="hidden lg:inline">
          {isInstallable ? 'تثبيت التطبيق الآن' : 'تثبيت التطبيق'}
        </span>
        <span className="lg:hidden">تثبيت</span>
      </button>

      {modalContent}
    </>
  );
};
