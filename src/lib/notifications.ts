import { Habit, ReminderSettings } from '../types';

const REMINDER_SETTINGS_KEY = 'habitflow_reminder_settings';
const REMINDED_LOG_KEY_PREFIX = 'habitflow_reminded_';
const SNOOZED_REMINDERS_KEY = 'habitflow_snoozed_reminders';

export const DEFAULT_TIME_OF_DAY_MAP: Record<Habit['timeOfDay'], string> = {
  morning: '08:00',
  afternoon: '14:00',
  evening: '20:00',
  anytime: '',
};

export const getDefaultTimeForPeriod = (timeOfDay: Habit['timeOfDay']): string => {
  return DEFAULT_TIME_OF_DAY_MAP[timeOfDay] || '09:00';
};

export const getEffectiveReminderTime = (habit: Habit): string | null => {
  if (habit.reminderEnabled === false) return null;
  if (habit.reminderTime && /^\d{2}:\d{2}$/.test(habit.reminderTime)) {
    return habit.reminderTime;
  }
  if (habit.reminderEnabled === true) {
    return getDefaultTimeForPeriod(habit.timeOfDay);
  }
  const fallback = DEFAULT_TIME_OF_DAY_MAP[habit.timeOfDay];
  return fallback || null;
};

export const timeStringToMinutes = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
};

export const formatTimeArabic = (hhmm: string): string => {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const period = h < 12 ? 'ص' : 'م';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const getReminderSettings = (): ReminderSettings => {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== false,
        soundEnabled: parsed.soundEnabled !== false,
        browserNotificationsEnabled: Boolean(parsed.browserNotificationsEnabled),
      };
    }
  } catch {
    // ignore
  }
  return {
    enabled: true,
    soundEnabled: true,
    browserNotificationsEnabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
  };
};

export const saveReminderSettings = (settings: ReminderSettings) => {
  try {
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

export const getRemindedTodayMap = (dateKey: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(`${REMINDED_LOG_KEY_PREFIX}${dateKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const markHabitRemindedToday = (dateKey: string, habitId: string, timeStr: string) => {
  try {
    const map = getRemindedTodayMap(dateKey);
    map[habitId] = timeStr;
    localStorage.setItem(`${REMINDED_LOG_KEY_PREFIX}${dateKey}`, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const getSnoozedMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(SNOOZED_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setHabitSnoozedUntil = (habitId: string, untilMs: number) => {
  try {
    const map = getSnoozedMap();
    map[habitId] = untilMs;
    localStorage.setItem(SNOOZED_REMINDERS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const clearHabitSnooze = (habitId: string) => {
  try {
    const map = getSnoozedMap();
    if (habitId in map) {
      delete map[habitId];
      localStorage.setItem(SNOOZED_REMINDERS_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
};

/**
 * Plays a gentle two-tone chime using Web Audio API.
 */
export const playReminderChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.14, now + startOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playNote(587.33, 0, 0.25); // D5
    playNote(880.0, 0.14, 0.35); // A5

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Audio playback may be blocked prior to user interaction
  }
};

export const getBrowserNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const sendBrowserNotification = async (title: string, body: string, tag?: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || 'habitflow-reminder',
          dir: 'rtl',
          lang: 'ar',
        });
        return;
      }
    }

    const n = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: tag || 'habitflow-reminder',
      dir: 'rtl',
      lang: 'ar',
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Fallback quietly if browser blocks Notification constructor in iframe
  }
};
