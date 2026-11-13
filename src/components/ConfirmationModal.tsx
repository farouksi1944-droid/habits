import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ConfirmDialogOptions } from '../types';

interface ConfirmationModalProps {
  options: ConfirmDialogOptions | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ options, onClose }) => {
  if (!options || !options.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-right overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => {
              if (options.onCancel) options.onCancel();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-100">
              {options.title}
            </h3>
            <div className={`p-2 rounded-xl ${options.isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {options.isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            {options.message}
          </p>

          {options.itemDescription && (
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-amber-300/90 font-mono">
              {options.itemDescription}
            </div>
          )}

          <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-end">
            <span>تنبيه: سيتم تطبيق هذا التعديل أيضاً في جدول بيانات Google Sheets المتصل</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (options.onCancel) options.onCancel();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
          >
            {options.cancelText || 'إلغاء الأمر'}
          </button>
          
          <button
            type="button"
            onClick={async () => {
              await options.onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
              options.isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            {options.confirmText || 'تأكيد المتابعة'}
          </button>
        </div>
      </div>
    </div>
  );
};
