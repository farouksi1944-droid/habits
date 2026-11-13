import React, { useEffect, useRef } from 'react';
import {
  Bell,
  BellOff,
  Check,
  Volume2,
  VolumeX,
  MonitorSmartphone,
  Sparkles,
  Clock,
  X,
} from 'lucide-react';
import { Habit, ReminderSettings } from '../types';
import { TodayReminderItem } from '../hooks/useHabitReminders';
import { formatTimeArabic } from '../lib/notifications';
import { toDateKey } from '../lib/dateUtils';

interface RemindersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReminderSettings;
  onUpdateSettings: (patch: Partial<ReminderSettings>) => void;
  browserPermission: NotificationPermission | 'unsupported';
  onEnableBrowserNotifications: () => Promise<void>;
  todaySchedule: TodayReminderItem[];
  onCompleteHabit: (habit: Habit, dateKey: string) => void;
  onTriggerTest: () => void;
}

export const RemindersPopover: React.FC<RemindersPopoverProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  browserPermission,
  onEnableBrowserNotifications,
  todaySchedule,
  onCompleteHabit,
  onTriggerTest,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayKey = toDateKey(new Date());

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl p-4 z-50 text-right space-y-4 animate-in fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-100">تذكيرات العادات اليومية</h3>
          <Bell className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Quick Controls */}
      <div className="space-y-2">
        {/* Master Enable Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <button
            type="button"
            onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              settings.enabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {settings.enabled ? 'مفعّل' : 'متوقف'}
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span>تفعيل التذكيرات التلقائية</span>
            {settings.enabled ? (
              <Bell className="w-4 h-4 text-emerald-400" />
            ) : (
              <BellOff className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>

        {/* Sound & Test Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              settings.soundEnabled
                ? 'bg-slate-800 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/70 border-slate-800 text-slate-400'
            }`}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{settings.soundEnabled ? 'الصوت مفعّل' : 'الصوت صامت'}</span>
          </button>

          <button
            type="button"
            onClick={onTriggerTest}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تجربة الإشعار</span>
          </button>
        </div>

        {/* Browser Desktop Notification Permission */}
        {browserPermission !== 'unsupported' && (
          <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
            {browserPermission === 'granted' ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      browserNotificationsEnabled: !settings.browserNotificationsEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    settings.browserNotificationsEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.browserNotificationsEnabled ? 'مفعّل' : 'إيقاف'}
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span>إشعارات سطح المكتب</span>
                  <MonitorSmartphone className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </>
            ) : browserPermission === 'denied' ? (
              <p className="text-[11px] text-slate-400 w-full leading-relaxed">
                إشعارات المتصفح محظورة من الإعدادات — ستعمل التنبيهات داخل التطبيق بصورة طبيعية.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onEnableBrowserNotifications}
                  className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  سماح
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span>تفعيل إشعارات النظام</span>
                  <MonitorSmartphone className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Today's Timed Habits Schedule */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-mono">{todaySchedule.length} مواعيد</span>
          <h4 className="font-bold text-slate-300">جدول تذكيرات اليوم</h4>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pl-1">
          {todaySchedule.length > 0 ? (
            todaySchedule.map(({ habit, time, completed, status }) => (
              <div
                key={habit.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                  completed
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-65'
                    : status === 'due'
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : status === 'missed'
                        ? 'bg-amber-950/25 border-amber-500/30'
                        : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  {!completed ? (
                    <button
                      type="button"
                      onClick={() => onCompleteHabit(habit, todayKey)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="تسجيل الإنجاز الآن"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      completed
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : status === 'due'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : status === 'missed'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {completed
                      ? 'مكتمل'
                      : status === 'due'
                        ? 'حان الوقت'
                        : status === 'missed'
                          ? 'فائت اليوم'
                          : 'قادم'}
                  </span>
                </div>

                <div className="min-w-0 text-right">
                  <p className={`text-xs font-bold truncate ${completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                    {habit.name}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-mono">
                    <span>{formatTimeArabic(time)}</span>
                    <Clock className="w-3 h-3" />
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-xs text-slate-400">
              لا توجد عادات بوقت تذكير محدد لليوم. يمكنك تحديد وقت التذكير عند إضافة أو تعديل أي عادة.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
