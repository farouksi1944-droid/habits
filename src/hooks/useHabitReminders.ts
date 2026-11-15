import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Habit, HabitLog, ReminderSettings } from '../types';
import { toDateKey, isHabitScheduledForDay } from '../lib/dateUtils';
import {
  getEffectiveReminderTime,
  timeStringToMinutes,
  getReminderSettings,
  saveReminderSettings,
  getConfirmedTodayMap,
  markHabitConfirmedToday,
  getLastSentTodayMap,
  recordHabitReminderSent,
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
  minutesUntil: number;
  repeatCount: number;
  lastSentAt: number;
  isTest?: boolean;
}

export interface TodayReminderItem {
  habit: Habit;
  time: string;
  minutes: number;
  minutesUntil: number;
  completed: boolean;
  confirmed: boolean;
  status: 'completed' | 'confirmed' | 'pre_due' | 'due' | 'missed' | 'upcoming';
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
  const [confirmedVersion, setConfirmedVersion] = useState<number>(0);

  // Habits temporarily hidden via X button until the next repeat interval fires
  const minimizedIdsRef = useRef<Set<string>>(new Set());

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
        'ستصلك تنبيهات متكررة قبل موعد عادتك بساعة وحتى تأكيدك.',
        'habitflow-welcome'
      );
    } else if (permission === 'denied') {
      updateSettings({ browserNotificationsEnabled: false });
    }
  }, [updateSettings]);

  const checkDueReminders = useCallback(() => {
    const now = new Date();
    const nowMs = now.getTime();
    setNowTick(nowMs);

    if (!settings.enabled) return;

    const todayKey = toDateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const confirmedMap = getConfirmedTodayMap(todayKey);
    const lastSentMap = getLastSentTodayMap(todayKey);
    const snoozedMap = getSnoozedMap();

    const leadMinutes = Math.max(0, settings.leadMinutes ?? 60);
    const repeatMs = Math.max(1, settings.repeatIntervalMinutes ?? 5) * 60 * 1000;

    const newlyTriggered: ActiveHabitReminder[] = [];
    const restoredReminders: ActiveHabitReminder[] = [];

    for (const habit of habits) {
      if (habit.archived) continue;
      if (!isHabitScheduledForDay(habit, now)) continue;

      const isCompletedToday = logs.some(
        l => l.habitId === habit.id && l.date === todayKey && l.completed
      );
      if (isCompletedToday) continue;

      const effectiveTime = getEffectiveReminderTime(habit);
      if (!effectiveTime) continue;

      // Stop completely once the user confirms receipt for this scheduled time today
      if (confirmedMap[habit.id] === effectiveTime) continue;

      const targetMinutes = timeStringToMinutes(effectiveTime);
      if (targetMinutes < 0) continue;

      const minutesUntil = targetMinutes - nowMinutes;

      // Active window: starts `leadMinutes` (default 60 min = 1 hour) before scheduled time
      // and stays active up to 180 min after scheduled time until confirmed or completed
      const inActiveWindow = nowMinutes >= targetMinutes - leadMinutes && nowMinutes <= targetMinutes + 180;
      if (!inActiveWindow) continue;

      // Respect active snooze
      const snoozeUntil = snoozedMap[habit.id];
      if (snoozeUntil && nowMs < snoozeUntil) {
        continue;
      }

      const snoozeJustExpired = Boolean(snoozeUntil && nowMs >= snoozeUntil);
      if (snoozeJustExpired) {
        clearHabitSnooze(habit.id);
      }

      const lastSent = lastSentMap[habit.id];
      const sameTimeSentBefore = Boolean(lastSent && lastSent.time === effectiveTime);
      const repeatIntervalElapsed = sameTimeSentBefore && nowMs - lastSent.sentAt >= repeatMs;

      if (snoozeJustExpired || !sameTimeSentBefore || repeatIntervalElapsed) {
        minimizedIdsRef.current.delete(habit.id);
        const sentEntry = recordHabitReminderSent(todayKey, habit.id, effectiveTime, nowMs);
        newlyTriggered.push({
          habit,
          scheduledTime: effectiveTime,
          minutesUntil,
          repeatCount: sentEntry.count,
          lastSentAt: sentEntry.sentAt,
        });
      } else if (sameTimeSentBefore && !minimizedIdsRef.current.has(habit.id)) {
        // Keep visible / restore after reload with fresh countdown without re-chiming
        restoredReminders.push({
          habit,
          scheduledTime: effectiveTime,
          minutesUntil,
          repeatCount: lastSent.count,
          lastSentAt: lastSent.sentAt,
        });
      }
    }

    if (newlyTriggered.length > 0 || restoredReminders.length > 0) {
      setActiveReminders(prev => {
        const testReminders = prev.filter(r => r.isTest);
        const byHabitId = new Map<string, ActiveHabitReminder>();

        // Keep existing non-test reminders that are still active (unless updated)
        for (const item of prev) {
          if (!item.isTest) {
            byHabitId.set(item.habit.id, item);
          }
        }
        for (const item of restoredReminders) {
          byHabitId.set(item.habit.id, item);
        }
        for (const item of newlyTriggered) {
          byHabitId.set(item.habit.id, item);
        }

        return [...testReminders, ...Array.from(byHabitId.values())].sort(
          (a, b) => a.minutesUntil - b.minutesUntil
        );
      });
    }

    if (newlyTriggered.length > 0) {
      if (settings.soundEnabled) {
        playReminderChime();
      }

      if (settings.browserNotificationsEnabled && browserPermission === 'granted') {
        for (const item of newlyTriggered) {
          const timingText =
            item.minutesUntil > 0
              ? `متبقي ${item.minutesUntil} دقيقة على الموعد (${formatTimeArabic(item.scheduledTime)})`
              : item.minutesUntil === 0
                ? `حان الآن موعد العادة (${formatTimeArabic(item.scheduledTime)})`
                : `مضى ${Math.abs(item.minutesUntil)} دقيقة على الموعد (${formatTimeArabic(item.scheduledTime)})`;

          sendBrowserNotification(
            `تذكير #${item.repeatCount}: ${item.habit.name}`,
            `${timingText} — افتح التطبيق للتأكيد أو تسجيل الإنجاز.`,
            `habitflow-${item.habit.id}-${todayKey}`,
            true
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
        if (done) {
          clearHabitSnooze(item.habit.id);
          minimizedIdsRef.current.delete(item.habit.id);
        }
        return !done;
      })
    );
  }, [logs]);

  // Periodic scheduler (checks immediately, every 15 seconds, and on tab focus/visibility)
  useEffect(() => {
    checkDueReminders();
    const timer = window.setInterval(checkDueReminders, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDueReminders();
      }
    };
    window.addEventListener('focus', checkDueReminders);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkDueReminders);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkDueReminders]);

  // Temporary minimize (hides card until next repeat interval fires)
  const dismissReminder = useCallback((habitId: string) => {
    if (!habitId.startsWith('test-')) {
      minimizedIdsRef.current.add(habitId);
    }
    setActiveReminders(prev => prev.filter(r => r.habit.id !== habitId));
  }, []);

  // Explicit user confirmation: stops repeating reminders for this scheduled time today
  const confirmReminder = useCallback(
    (habitId: string, scheduledTime?: string) => {
      clearHabitSnooze(habitId);
      minimizedIdsRef.current.delete(habitId);
      setActiveReminders(prev => prev.filter(r => r.habit.id !== habitId));

      if (!habitId.startsWith('test-')) {
        const todayKey = toDateKey(new Date());
        const targetHabit = habits.find(h => h.id === habitId);
        const timeToConfirm =
          scheduledTime || (targetHabit ? getEffectiveReminderTime(targetHabit) : null);
        if (timeToConfirm) {
          markHabitConfirmedToday(todayKey, habitId, timeToConfirm);
          setConfirmedVersion(v => v + 1);
        }
      }
    },
    [habits]
  );

  const snoozeReminder = useCallback((habitId: string, minutes: number = 15) => {
    const until = Date.now() + minutes * 60 * 1000;
    setHabitSnoozedUntil(habitId, until);
    minimizedIdsRef.current.delete(habitId);
    setActiveReminders(prev => prev.filter(r => r.habit.id !== habitId));
  }, []);

  const completeFromReminder = useCallback(
    (habit: Habit) => {
      const todayKey = toDateKey(new Date());
      clearHabitSnooze(habit.id);
      minimizedIdsRef.current.delete(habit.id);
      setActiveReminders(prev => prev.filter(r => r.habit.id !== habit.id));
      if (!habit.id.startsWith('test-')) {
        const effectiveTime = getEffectiveReminderTime(habit);
        if (effectiveTime) {
          markHabitConfirmedToday(todayKey, habit.id, effectiveTime);
          setConfirmedVersion(v => v + 1);
        }
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
      name: 'تذكير تجريبي قبل الموعد بساعة ✨',
      category: 'wellness',
      color: '#10b981',
      icon: 'bell',
      weeklyTarget: 7,
      timeOfDay: 'anytime',
      reminderTime: hhmm,
      reminderEnabled: true,
      createdAt: now.toISOString(),
    };

    setActiveReminders(prev => [
      ...prev,
      {
        habit: testHabit,
        scheduledTime: hhmm,
        minutesUntil: 45,
        repeatCount: 1,
        lastSentAt: now.getTime(),
        isTest: true,
      },
    ]);

    if (settings.soundEnabled) {
      playReminderChime();
    }

    if (settings.browserNotificationsEnabled && browserPermission === 'granted') {
      sendBrowserNotification(
        'تذكير تجريبي — متتبع العادات',
        `هكذا سيصلك التذكير قبل ساعة من الموعد ويتكرر حتى تأكيدك.`,
        'habitflow-test',
        true
      );
    }
  }, [settings, browserPermission]);

  const todaySchedule = useMemo<TodayReminderItem[]>(() => {
    const now = new Date(nowTick);
    const todayKey = toDateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const confirmedMap = getConfirmedTodayMap(todayKey);
    const leadMinutes = Math.max(0, settings.leadMinutes ?? 60);

    const items: TodayReminderItem[] = [];

    for (const habit of habits) {
      if (habit.archived) continue;
      if (!isHabitScheduledForDay(habit, now)) continue;

      const time = getEffectiveReminderTime(habit);
      if (!time) continue;

      const minutes = timeStringToMinutes(time);
      if (minutes < 0) continue;

      const minutesUntil = minutes - nowMinutes;

      const completed = logs.some(
        l => l.habitId === habit.id && l.date === todayKey && l.completed
      );
      const confirmed = confirmedMap[habit.id] === time;

      let status: TodayReminderItem['status'] = 'upcoming';
      if (completed) {
        status = 'completed';
      } else if (confirmed) {
        status = 'confirmed';
      } else if (nowMinutes >= minutes && nowMinutes - minutes <= 180) {
        status = 'due';
      } else if (nowMinutes >= minutes - leadMinutes && nowMinutes < minutes) {
        status = 'pre_due';
      } else if (nowMinutes - minutes > 180) {
        status = 'missed';
      }

      items.push({ habit, time, minutes, minutesUntil, completed, confirmed, status });
    }

    return items.sort((a, b) => a.minutes - b.minutes);
  }, [habits, logs, nowTick, settings.leadMinutes, confirmedVersion]);

  const nextUpcomingReminder = useMemo<TodayReminderItem | null>(() => {
    const upcoming = todaySchedule.find(
      item => !item.completed && (item.status === 'pre_due' || item.status === 'upcoming' || item.status === 'due')
    );
    return upcoming || null;
  }, [todaySchedule]);

  const dueCount = useMemo(
    () =>
      todaySchedule.filter(
        i => !i.completed && !i.confirmed && (i.status === 'pre_due' || i.status === 'due' || i.status === 'missed')
      ).length,
    [todaySchedule]
  );

  return {
    settings,
    updateSettings,
    browserPermission,
    enableBrowserNotifications,
    activeReminders,
    todaySchedule,
    nextUpcomingReminder,
    dueCount,
    dismissReminder,
    confirmReminder,
    snoozeReminder,
    completeFromReminder,
    triggerTestNotification,
  };
};
