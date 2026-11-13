import { Habit, HabitLog } from '../types';

export const DAYS_OF_WEEK = [
  { index: 0, label: 'الأحد', short: 'أحد' },
  { index: 1, label: 'الإثنين', short: 'إثنين' },
  { index: 2, label: 'الثلاثاء', short: 'ثلاثاء' },
  { index: 3, label: 'الأربعاء', short: 'أربعاء' },
  { index: 4, label: 'الخميس', short: 'خميس' },
  { index: 5, label: 'الجمعة', short: 'جمعة' },
  { index: 6, label: 'السبت', short: 'سبت' },
];

export const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getArabicDayName = (date: Date): string => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[date.getDay()];
};

export const getArabicDateDisplay = (date: Date): string => {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Checks if a habit is scheduled for a specific date
 */
export const isHabitScheduledForDay = (habit: Habit, date: Date): boolean => {
  if (habit.scheduleType === 'specific_days' && habit.targetDays && habit.targetDays.length > 0) {
    return habit.targetDays.includes(date.getDay());
  }
  return true;
};

/**
 * Converts targetDays array [0, 2] to readable Arabic text "الأحد، الثلاثاء"
 */
export const getScheduledDaysArabic = (targetDays?: number[]): string => {
  if (!targetDays || targetDays.length === 0) return 'يومياً';
  if (targetDays.length === 7) return 'كل يوم (7 أيام)';
  if (targetDays.length === 5 && [0, 1, 2, 3, 4].every(d => targetDays.includes(d))) {
    return 'أيام الأسبوع (الأحد - الخميس)';
  }
  return targetDays
    .slice()
    .sort()
    .map(idx => DAYS_OF_WEEK.find(d => d.index === idx)?.label || '')
    .filter(Boolean)
    .join('، ');
};

/**
 * Returns past N days keys ending with today or specified date
 */
export const getLastNDays = (numDays: number = 7, refDate: Date = new Date()): { key: string; date: Date; isToday: boolean }[] => {
  const days = [];
  const todayKey = toDateKey(new Date());

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    const key = toDateKey(d);
    days.push({
      key,
      date: d,
      isToday: key === todayKey,
    });
  }
  return days;
};

/**
 * Calculate completion percentage for a habit over a period (e.g. 7 or 28 days),
 * respecting weeklyTarget and specific scheduled days.
 */
export const calculateHabitPeriodCompletionRate = (
  habit: Habit,
  logs: HabitLog[],
  numDays: number = 7,
  refDate: Date = new Date()
): { percentage: number; completedCount: number; targetCount: number } => {
  const days = getLastNDays(numDays, refDate);
  const completedKeys = new Set(
    logs.filter(l => l.habitId === habit.id && l.completed).map(l => l.date)
  );

  const completedInPeriod = days.filter(d => completedKeys.has(d.key)).length;

  let targetCount = 0;
  if (habit.scheduleType === 'specific_days' && habit.targetDays && habit.targetDays.length > 0) {
    targetCount = days.filter(d => isHabitScheduledForDay(habit, d.date)).length;
  } else {
    const weeks = numDays / 7;
    targetCount = Math.round((habit.weeklyTarget || 7) * weeks);
  }

  targetCount = Math.max(1, targetCount);
  const percentage = Math.min(100, Math.round((completedInPeriod / targetCount) * 100));

  return {
    percentage,
    completedCount: completedInPeriod,
    targetCount,
  };
};

/**
 * Calculate current streak & longest streak for a habit (accounting for specific scheduled days)
 */
export const calculateStreak = (habitId: string, logs: HabitLog[], habit?: Habit): { current: number; longest: number } => {
  const completedDateKeys = new Set(
    logs
      .filter(l => l.habitId === habitId && l.completed)
      .map(l => l.date)
  );

  const today = new Date();
  const isScheduled = (d: Date) => habit ? isHabitScheduledForDay(habit, d) : true;

  // Find the last scheduled date before or on today
  let lastScheduledDate = new Date(today);
  while (!isScheduled(lastScheduledDate)) {
    lastScheduledDate.setDate(lastScheduledDate.getDate() - 1);
  }

  const todayKey = toDateKey(today);
  const isTodayScheduled = isScheduled(today);

  let checkDate = new Date(today);
  let current = 0;

  if (isTodayScheduled && !completedDateKeys.has(todayKey)) {
    // Today was scheduled but not completed yet; check previous scheduled day
    checkDate.setDate(checkDate.getDate() - 1);
    while (!isScheduled(checkDate)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    if (!completedDateKeys.has(toDateKey(checkDate))) {
      return { current: 0, longest: calculateLongestStreak(completedDateKeys) };
    }
  } else if (!isTodayScheduled) {
    // Today was not scheduled, start from last scheduled date
    checkDate = new Date(lastScheduledDate);
    if (!completedDateKeys.has(toDateKey(checkDate))) {
      return { current: 0, longest: calculateLongestStreak(completedDateKeys) };
    }
  }

  // Count backwards across scheduled days
  let loopCount = 0;
  while (loopCount < 365) {
    loopCount++;
    const key = toDateKey(checkDate);
    if (completedDateKeys.has(key)) {
      current++;
      // Step backwards to previous scheduled day
      checkDate.setDate(checkDate.getDate() - 1);
      while (!isScheduled(checkDate)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      break;
    }
  }

  const longest = Math.max(current, calculateLongestStreak(completedDateKeys));
  return { current, longest };
};

const calculateLongestStreak = (dateKeysSet: Set<string>): number => {
  if (dateKeysSet.size === 0) return 0;
  const sortedDates = Array.from(dateKeysSet).sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseDateKey(sortedDates[i - 1]);
    const curr = parseDateKey(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
};
