import { useState, useEffect, useCallback, useMemo } from 'react';
import { Habit, HabitLog, ReminderSettings } from '../types';
import { toDateKey, isHabitScheduledForDay } from '../lib/dateUtils';
import {
  getEffectiveReminderTime,
  timeStringToMinutes,
  getReminderSettings,
  saveReminderSettings,
  getRemindedTodayMap,
  markHabitRemindedToday,
  getSnoozedMap,
  setHabitSnoozedUntil,
  clearHabitSnooze,
  playReminderChime,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  formatTimeArabic,
} from '../lib/notifications';

export interface ActiveHabitReminder {
  habit: Habit;
  scheduledTime: string;
  isTest?: boolean;
}

export interface TodayReminderItem {
  habit: Habit;
  time: string;
  minutes: number;
  completed: boolean;
  status: 'completed' | 'due' | 'missed' | 'upcoming';
}

interface UseHabitRemindersProps {
  habits: Habit[];
  logs: HabitLog[];
  onCompleteHabit: (habit: Habit, dateKey: string) => void;
}

export const useHabitReminders = ({
  habits,
  logs,
  onCompleteHabit,
}: UseHabitRemindersProps) => {
  const [settings, setSettings] = useState<ReminderSettings>(() => getReminderSettings());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission()
  );
  const [activeReminders, setActiveReminders] = useState<ActiveHabitReminder[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const updateSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveReminderSettings(next);
      return next;
    });
  }, []);

  const enableBrowserNotifications = useCallback(async () => {
    const permission = await requestBrowserNotificationPermission();
    setBrowserPermission(permission);
    if (permission === 'granted') {
      updateSettings({ browserNotificationsEnabled: true });
      await sendBrowserNotification(
        'تم تفعيل إشعارات متتبع العادات',
        'ستصلك تنبيهات تذكيرية في الأوقات المحددة لعاداتك اليومية.',
        'habitflow-welcome'
      );
    } else if (permission === 'denied') {
      updateSettings({ browserNotificationsEnabled: false });
    }
  }, [updateSettings]);

  const checkDueReminders = useCallback(() => {
    const now = new Date();
    setNowTick(now.getTime());

    if (!settings.enabled) return;

    const todayKey = toDateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const remindedMap = getRemindedTodayMap(todayKey);
    const snoozedMap = getSnoozedMap();

    const newlyTriggered: ActiveHabitReminder[] = [];

    for (const habit of habits) {
      if (habit.archived) continue;
      if (!isHabitScheduledForDay(habit, now)) continue;

      const isCompletedToday = logs.some(
        l => l.habitId === habit.id && l.date === todayKey && l.completed
      );
      if (isCompletedToday) continue;

      const effectiveTime = getEffectiveReminderTime(habit);
      if (!effectiveTime) continue;

      const targetMinutes = timeStringToMinutes(effectiveTime);
      if (targetMinutes < 0) continue;

      // Check if snoozed and snooze period just elapsed
      const snoozeUntil = snoozedMap[habit.id];
      if (snoozeUntil) {
        if (now.getTime() < snoozeUntil) {
          continue; // Still snoozed
        }
        // Snooze finished -> trigger reminder again and clear snooze
        clearHabitSnooze(habit.id);
        newlyTriggered.push({ habit, scheduledTime: effectiveTime });
        markHabitRemindedToday(todayKey, habit.id, effectiveTime);
        continue;
      }

      // Already reminded for this scheduled time today
      if (remindedMap[habit.id] === effectiveTime) continue;

      // Trigger if we are at or within 120 minutes past the habit's scheduled time
      const diffMinutes = nowMinutes - targetMinutes;
      if (diffMinutes >= 0 && diffMinutes <= 120) {
        newlyTriggered.push({ habit, scheduledTime: effectiveTime });
        markHabitRemindedToday(todayKey, habit.id, effectiveTime);
      }
    }

    if (newlyTriggered.length > 0) {
      setActiveReminders(prev => {
        const existingIds = new Set(prev.map(r => r.habit.id));
        const uniqueNew = newlyTriggered.filter(r => !existingIds.has(r.habit.id));
        return [...prev, ...uniqueNew];
      });

      if (settings.soundEnabled) {
        playReminderChime();
      }

      if (settings.browserNotificationsEnabled && browserPermission === 'granted') {
        for (const item of newlyTriggered) {
          sendBrowserNotification(
            `تذكير عادة: ${item.habit.name}`,
            `حان وقت إنجاز عادتك (${formatTimeArabic(item.scheduledTime)})`,
            `habitflow-${item.habit.id}-${todayKey}`
          );
        }
      }
    }
  }, [habits, logs, settings, browserPermission]);

  // Remove active reminder toast automatically if habit gets completed elsewhere
  useEffect(() => {
    const todayKey = toDateKey(new Date());
    setActiveReminders(prev =>
      prev.filter(item => {
        if (item.isTest) return true;
        const done = logs.some(
          l => l.habitId === item.habit.id && l.date === todayKey && l.completed
        );
        return !done;
      })
    );
  }, [logs]);

  // Periodic scheduler (checks immediately & every 20 seconds)
  useEffect(() => {
    checkDueReminders();
    const timer = window.setInterval(checkDueReminders, 20000);
    return () => window.clearInterval(timer);
  }, [checkDueReminders]);

  const dismissReminder = useCallback((habitId: string) => {
    clearHabitSnooze(habitId);
    setActiveReminders(prev => prev.filter(r => r.habit.id !== habitId));
  }, []);

  const snoozeReminder = useCallback((habitId: string, minutes: number = 15) => {
    const until = Date.now() + minutes * 60 * 1000;
    setHabitSnoozedUntil(habitId, until);
    setActiveReminders(prev => prev.filter(r => r.habit.id !== habitId));
  }, []);

  const completeFromReminder = useCallback(
    (habit: Habit) => {
      const todayKey = toDateKey(new Date());
      clearHabitSnooze(habit.id);
      setActiveReminders(prev => prev.filter(r => r.habit.id !== habit.id));
      if (!habit.id.startsWith('test-')) {
        onCompleteHabit(habit, todayKey);
      }
    },
    [onCompleteHabit]
  );

  const triggerTestNotification = useCallback(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const testHabit: Habit = {
      id: `test-${Date.now()}`,
      name: 'تذكير تجريبي لعاداتك اليومية ✨',
      category: 'wellness',
      color: '#10b981',
      icon: 'bell',
      weeklyTarget: 7,
      timeOfDay: 'anytime',
      reminderTime: hhmm,
      reminderEnabled: true,
      createdAt: now.toISOString(),
    };

    setActiveReminders(prev => [...prev, { habit: testHabit, scheduledTime: hhmm, isTest: true }]);

    if (settings.soundEnabled) {
      playReminderChime();
    }

    if (settings.browserNotificationsEnabled && browserPermission === 'granted') {
      sendBrowserNotification(
        'تذكير تجريبي — متتبع العادات',
        `هكذا سيظهر التذكير عند حلول وقت العادة (${formatTimeArabic(hhmm)}).`,
        'habitflow-test'
      );
    }
  }, [settings, browserPermission]);

  const todaySchedule = useMemo<TodayReminderItem[]>(() => {
    const now = new Date(nowTick);
    const todayKey = toDateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const items: TodayReminderItem[] = [];

    for (const habit of habits) {
      if (habit.archived) continue;
      if (!isHabitScheduledForDay(habit, now)) continue;

      const time = getEffectiveReminderTime(habit);
      if (!time) continue;

      const minutes = timeStringToMinutes(time);
      if (minutes < 0) continue;

      const completed = logs.some(
        l => l.habitId === habit.id && l.date === todayKey && l.completed
      );

      let status: TodayReminderItem['status'] = 'upcoming';
      if (completed) {
        status = 'completed';
      } else if (nowMinutes >= minutes && nowMinutes - minutes <= 120) {
        status = 'due';
      } else if (nowMinutes - minutes > 120) {
        status = 'missed';
      }

      items.push({ habit, time, minutes, completed, status });
    }

    return items.sort((a, b) => a.minutes - b.minutes);
  }, [habits, logs, nowTick]);

  const dueCount = useMemo(
    () => todaySchedule.filter(i => !i.completed && (i.status === 'due' || i.status === 'missed')).length,
    [todaySchedule]
  );

  return {
    settings,
    updateSettings,
    browserPermission,
    enableBrowserNotifications,
    activeReminders,
    todaySchedule,
    dueCount,
    dismissReminder,
    snoozeReminder,
    completeFromReminder,
    triggerTestNotification,
  };
};
