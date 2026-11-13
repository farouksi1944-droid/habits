import React from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Plus, 
  RefreshCw, 
  LogOut, 
  Sliders, 
  CheckCircle,
  WifiOff,
  Clock,
  Focus,
  Bell
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Habit, ReminderSettings, SpreadsheetInfo } from '../types';
import { TodayReminderItem } from '../hooks/useHabitReminders';
import { PWAInstallButton } from './PWAInstallButton';
import { RemindersPopover } from './RemindersPopover';

interface NavbarProps {
  user: User | null;
  spreadsheetInfo: SpreadsheetInfo | null;
  isSyncing: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  reminderSettings: ReminderSettings;
  onUpdateReminderSettings: (patch: Partial<ReminderSettings>) => void;
  browserNotificationPermission: NotificationPermission | 'unsupported';
  onEnableBrowserNotifications: () => Promise<void>;
  todaySchedule: TodayReminderItem[];
  dueReminderCount: number;
  onCompleteHabitFromReminder: (habit: Habit, dateKey: string) => void;
  onTriggerTestReminder: () => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onManualSync: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  spreadsheetInfo,
  isSyncing,
  isOnline,
  pendingSyncCount,
  isFocusMode,
  onToggleFocusMode,
  reminderSettings,
  onUpdateReminderSettings,
  browserNotificationPermission,
  onEnableBrowserNotifications,
  todaySchedule,
  dueReminderCount,
  onCompleteHabitFromReminder,
  onTriggerTestReminder,
  onOpenAddModal,
  onOpenSettingsModal,
  onManualSync,
  onSignIn,
  onSignOut,
}) => {
  const [isRemindersOpen, setIsRemindersOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Actions (Left in RTL, Right in LTR) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">عادة جديدة</span>
            <span className="sm:hidden">إضافة</span>
          </button>

          {/* Focus Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleFocusMode}
            title="تفعيل نمط التركيز لإخفاء العناصر الجانبية والتركيز على العادات اليومية"
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              isFocusMode
                ? 'bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-slate-800/80'
            }`}
          >
            <Focus className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">نمط التركيز</span>
          </button>

          {/* Sync status & direct link to Google Sheets */}
          {user && spreadsheetInfo?.id ? (
            <div className="hidden md:flex items-center gap-2">
              <a
                href={
                  spreadsheetInfo.url ||
                  `https://docs.google.com/spreadsheets/d/${spreadsheetInfo.id}/edit${
                    user.email ? `?authuser=${encodeURIComponent(user.email)}` : ''
                  }`
                }
                target="_blank"
                rel="noopener noreferrer"
                title="فتح جدول بيانات Google Sheets مباشرة"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>فتح في Google Sheets</span>
                <ExternalLink className="w-3 h-3 text-emerald-400/80" />
              </a>

              <button
                onClick={onManualSync}
                disabled={isSyncing}
                title="مزامنة فورية مع Google Sheets"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          ) : null}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Reminders & Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRemindersOpen(prev => !prev)}
              title="التذكيرات والإشعارات اليومية"
              className={`relative p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isRemindersOpen
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Bell className={`w-4 h-4 ${reminderSettings.enabled ? 'text-amber-400' : 'text-slate-500'}`} />
              {reminderSettings.enabled && dueReminderCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-sm">
                  {dueReminderCount}
                </span>
              )}
            </button>

            <RemindersPopover
              isOpen={isRemindersOpen}
              onClose={() => setIsRemindersOpen(false)}
              settings={reminderSettings}
              onUpdateSettings={onUpdateReminderSettings}
              browserPermission={browserNotificationPermission}
              onEnableBrowserNotifications={onEnableBrowserNotifications}
              todaySchedule={todaySchedule}
              onCompleteHabit={onCompleteHabitFromReminder}
              onTriggerTest={onTriggerTestReminder}
            />
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenSettingsModal}
            title="إعدادات التطبيق والمزامنة"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* User profile / Auth button */}
          {user ? (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full ring-2 ring-emerald-500/30 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-emerald-100 flex items-center justify-center text-xs font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <button
                onClick={onSignOut}
                title="تسجيل الخروج"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 transition-colors"
            >
              <span>ربط Google</span>
            </button>
          )}
        </div>

        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-100">
                متتبع العادات
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Sheets
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {!isOnline ? (
                <span className="text-amber-400 flex items-center gap-1 justify-end">
                  <WifiOff className="w-3 h-3 inline" />
                  وضع عدم الاتصال — محفوظ محلياً{pendingSyncCount > 0 ? ` (${pendingSyncCount} بانتظار المزامنة)` : ''}
                </span>
              ) : isSyncing ? (
                <span className="text-emerald-400 flex items-center gap-1 justify-end">
                  <RefreshCw className="w-3 h-3 animate-spin inline" />
                  جارِ المزامنة مع Google Sheets...
                </span>
              ) : pendingSyncCount > 0 ? (
                <span className="text-amber-300 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3 inline" />
                  {pendingSyncCount} تغييرات محفوظة محلياً بانتظار المزامنة
                </span>
              ) : user && spreadsheetInfo?.id ? (
                <span className="text-emerald-400/90 flex items-center gap-1 justify-end">
                  <CheckCircle className="w-3 h-3 inline text-emerald-400" />
                  متزامن مع سحابة Google
                </span>
              ) : (
                <span>محفوظ محلياً على جهازك</span>
              )}
            </p>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

      </div>
    </header>
  );
};
