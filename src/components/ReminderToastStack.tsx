import React from 'react';
import { BellRing, Check, CheckCheck, Clock, X } from 'lucide-react';
import { ActiveHabitReminder } from '../hooks/useHabitReminders';
import { formatTimeArabic } from '../lib/notifications';
import { Habit } from '../types';

interface ReminderToastStackProps {
  reminders: ActiveHabitReminder[];
  repeatIntervalMinutes: number;
  onComplete: (habit: Habit) => void;
  onConfirm: (habitId: string, scheduledTime?: string) => void;
  onSnooze: (habitId: string, minutes?: number) => void;
  onDismiss: (habitId: string) => void;
}

export const ReminderToastStack: React.FC<ReminderToastStackProps> = ({
  reminders,
  repeatIntervalMinutes,
  onComplete,
  onConfirm,
  onSnooze,
  onDismiss,
}) => {
  if (reminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] text-right">
      {reminders.map(({ habit, scheduledTime, minutesUntil, repeatCount, isTest }) => {
        const timingBadge = isTest
          ? `إشعار تجريبي • ${formatTimeArabic(scheduledTime)}`
          : minutesUntil > 0
            ? `تذكير قبل الموعد بـ ${minutesUntil} د • ${formatTimeArabic(scheduledTime)}`
            : minutesUntil === 0
              ? `حان موعد العادة الآن • ${formatTimeArabic(scheduledTime)}`
              : `متأخر عن الموعد بـ ${Math.abs(minutesUntil)} د • ${formatTimeArabic(scheduledTime)}`;

        return (
          <div
            key={habit.id}
            className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl p-4 animate-in fade-in"
            role="alert"
          >
            {/* Accent right bar */}
            <div
              className="absolute top-0 right-0 w-1.5 h-full"
              style={{ backgroundColor: habit.color }}
            />

            <div className="flex items-start justify-between gap-3 pr-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                  <BellRing className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-400">
                    {timingBadge}
                  </p>
                  <h4 className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">
                    {habit.name}
                  </h4>
                  {!isTest && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      التنبيه #{repeatCount} · يتكرر كل {repeatIntervalMinutes} د حتى تؤكد
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(habit.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title={isTest ? 'إغلاق' : 'إخفاء مؤقت (سيعود التنبيه في الدورة القادمة حتى تؤكده)'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 pr-2 flex-wrap">
              <button
                type="button"
                onClick={() => onComplete(habit)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isTest ? 'حسناً' : 'تم الإنجاز'}</span>
              </button>

              {!isTest && (
                <>
                  <button
                    type="button"
                    onClick={() => onConfirm(habit.id, scheduledTime)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                    title="تأكيد استلام التذكير وإيقاف التكرار لهذا الموعد"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>تأكيد التذكير</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSnooze(habit.id, 15)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    title="تأجيل التذكير 15 دقيقة ثم معاودة الإرسال"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>15 د</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
