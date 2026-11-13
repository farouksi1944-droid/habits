import React from 'react';
import { BellRing, Check, Clock, X } from 'lucide-react';
import { ActiveHabitReminder } from '../hooks/useHabitReminders';
import { formatTimeArabic } from '../lib/notifications';
import { Habit } from '../types';

interface ReminderToastStackProps {
  reminders: ActiveHabitReminder[];
  onComplete: (habit: Habit) => void;
  onSnooze: (habitId: string, minutes?: number) => void;
  onDismiss: (habitId: string) => void;
}

export const ReminderToastStack: React.FC<ReminderToastStackProps> = ({
  reminders,
  onComplete,
  onSnooze,
  onDismiss,
}) => {
  if (reminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] text-right">
      {reminders.map(({ habit, scheduledTime, isTest }) => (
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
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                <BellRing className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-400">
                  {isTest ? 'إشعار تجريبي' : 'تذكير بموعد العادة'} • {formatTimeArabic(scheduledTime)}
                </p>
                <h4 className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">
                  {habit.name}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(habit.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pr-2">
            <button
              type="button"
              onClick={() => onComplete(habit)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isTest ? 'حسناً' : 'تم الإنجاز'}</span>
            </button>

            {!isTest && (
              <button
                type="button"
                onClick={() => onSnooze(habit.id, 15)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>تأجيل 15 د</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
