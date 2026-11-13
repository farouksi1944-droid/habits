import { Habit, HabitLog } from '../types';
import { calculateStreak, isHabitScheduledForDay, parseDateKey } from './dateUtils';

export const XP_RULES = {
  PER_COMPLETION: 15,
  PER_PERFECT_DAY: 20,
  PER_STREAK_DAY: 5,
  PER_WEEK_STREAK_MILESTONE: 20,
  PER_NOTE: 5,
} as const;

export interface LevelRank {
  title: string;
  accentGradient: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  barGradient: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface GamificationSummary {
  totalXP: number;
  level: number;
  rank: LevelRank;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemaining: number;
  levelProgressPercent: number;
  breakdown: {
    completionXP: number;
    partialGoalXP: number;
    perfectDaysXP: number;
    streakXP: number;
    notesXP: number;
  };
  stats: {
    totalCompleted: number;
    perfectDaysCount: number;
    maxLongestStreak: number;
    activeStreakSum: number;
    notesCount: number;
  };
  achievements: AchievementBadge[];
  unlockedAchievementsCount: number;
}

export function getXpRequiredForLevel(level: number): number {
  return 100 + Math.max(0, level - 1) * 50;
}

export function getLevelRank(level: number): LevelRank {
  if (level >= 15) {
    return {
      title: 'أسطورة الاستمرارية',
      accentGradient: 'from-amber-400 via-orange-500 to-rose-500',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-400',
      barGradient: 'from-amber-500 via-orange-400 to-rose-500',
    };
  }
  if (level >= 11) {
    return {
      title: 'قائد الإنجاز',
      accentGradient: 'from-amber-500 to-yellow-500',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/35',
      badgeText: 'text-amber-400',
      barGradient: 'from-amber-500 to-yellow-400',
    };
  }
  if (level >= 8) {
    return {
      title: 'منضبط محترف',
      accentGradient: 'from-purple-500 to-indigo-500',
      badgeBg: 'bg-purple-500/15',
      badgeBorder: 'border-purple-500/35',
      badgeText: 'text-purple-400',
      barGradient: 'from-purple-500 to-indigo-400',
    };
  }
  if (level >= 5) {
    return {
      title: 'صانع العادات',
      accentGradient: 'from-blue-500 to-indigo-500',
      badgeBg: 'bg-blue-500/15',
      badgeBorder: 'border-blue-500/35',
      badgeText: 'text-blue-400',
      barGradient: 'from-blue-500 to-cyan-400',
    };
  }
  if (level >= 3) {
    return {
      title: 'مثابر نشط',
      accentGradient: 'from-teal-500 to-emerald-500',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/35',
      badgeText: 'text-emerald-400',
      barGradient: 'from-emerald-500 to-teal-400',
    };
  }
  return {
    title: 'مبتدئ طموح',
    accentGradient: 'from-emerald-500 to-green-500',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    barGradient: 'from-emerald-500 to-teal-400',
  };
}

export function calculateGamification(habits: Habit[], logs: HabitLog[]): GamificationSummary {
  const activeHabits = habits.filter(h => !h.archived);
  const completedLogs = logs.filter(l => l.completed);
  const totalCompleted = completedLogs.length;

  // 1. Base completion XP
  const completionXP = totalCompleted * XP_RULES.PER_COMPLETION;

  // 2. Partial numeric goal progress XP (up to +10 XP for active incomplete goals)
  let partialGoalXP = 0;
  const habitById = new Map(habits.map(h => [h.id, h]));
  for (const log of logs) {
    if (log.completed) continue;
    const habit = habitById.get(log.habitId);
    if (habit && habit.goalType === 'numeric' && (habit.goalTarget ?? 0) > 0 && (log.progressValue ?? 0) > 0) {
      const ratio = Math.min(0.95, (log.progressValue || 0) / (habit.goalTarget || 1));
      partialGoalXP += Math.floor(ratio * 10);
    }
  }

  // 3. Perfect days XP (all scheduled active habits completed on that date)
  const completedByDate = new Map<string, Set<string>>();
  for (const log of completedLogs) {
    if (!completedByDate.has(log.date)) {
      completedByDate.set(log.date, new Set());
    }
    completedByDate.get(log.date)!.add(log.habitId);
  }

  let perfectDaysCount = 0;
  if (activeHabits.length > 0) {
    for (const [dateKey, completedHabitIds] of completedByDate.entries()) {
      const dateObj = parseDateKey(dateKey);
      const scheduled = activeHabits.filter(h => isHabitScheduledForDay(h, dateObj));
      if (scheduled.length > 0 && scheduled.every(h => completedHabitIds.has(h.id))) {
        perfectDaysCount++;
      }
    }
  }
  const perfectDaysXP = perfectDaysCount * XP_RULES.PER_PERFECT_DAY;

  // 4. Consistency / Streak XP
  let activeStreakSum = 0;
  let maxLongestStreak = 0;
  let weeklyMilestoneCount = 0;
  for (const habit of activeHabits) {
    const { current, longest } = calculateStreak(habit.id, logs, habit);
    activeStreakSum += current;
    if (longest > maxLongestStreak) {
      maxLongestStreak = longest;
    }
    weeklyMilestoneCount += Math.floor(longest / 7);
  }
  const streakXP =
    activeStreakSum * XP_RULES.PER_STREAK_DAY +
    weeklyMilestoneCount * XP_RULES.PER_WEEK_STREAK_MILESTONE;

  // 5. Daily journal notes XP
  const notesCount = logs.filter(l => Boolean(l.notes && l.notes.trim().length > 0)).length;
  const notesXP = notesCount * XP_RULES.PER_NOTE;

  // Total XP & Level calculation
  const totalXP = completionXP + partialGoalXP + perfectDaysXP + streakXP + notesXP;

  let level = 1;
  let remaining = totalXP;
  while (remaining >= getXpRequiredForLevel(level)) {
    remaining -= getXpRequiredForLevel(level);
    level++;
  }

  const xpForNextLevel = getXpRequiredForLevel(level);
  const xpIntoLevel = remaining;
  const xpRemaining = xpForNextLevel - xpIntoLevel;
  const levelProgressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  const rank = getLevelRank(level);

  const achievements: AchievementBadge[] = [
    {
      id: 'first-step',
      title: 'أول خطوة',
      description: 'إتمام أول عادة بنجاح',
      unlocked: totalCompleted >= 1,
    },
    {
      id: 'streak-3',
      title: 'بداية الانضباط',
      description: 'تحقيق سلسلة 3 أيام متواصلة',
      unlocked: maxLongestStreak >= 3,
    },
    {
      id: 'streak-7',
      title: 'أسبوع متواصل',
      description: 'تحقيق سلسلة 7 أيام متواصلة',
      unlocked: maxLongestStreak >= 7,
    },
    {
      id: 'perfect-day',
      title: 'يوم مثالي',
      description: 'إتمام جميع العادات المجدولة في يوم واحد',
      unlocked: perfectDaysCount >= 1,
    },
    {
      id: 'journaler',
      title: 'كاتب اليوميات',
      description: 'إضافة 5 ملاحظات أو تدوينات يومية',
      unlocked: notesCount >= 5,
    },
    {
      id: 'xp-500',
      title: 'جامع النقاط',
      description: 'الوصول إلى 500 نقطة خبرة XP',
      unlocked: totalXP >= 500,
    },
  ];

  const unlockedAchievementsCount = achievements.filter(a => a.unlocked).length;

  return {
    totalXP,
    level,
    rank,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining,
    levelProgressPercent,
    breakdown: {
      completionXP,
      partialGoalXP,
      perfectDaysXP,
      streakXP,
      notesXP,
    },
    stats: {
      totalCompleted,
      perfectDaysCount,
      maxLongestStreak,
      activeStreakSum,
      notesCount,
    },
    achievements,
    unlockedAchievementsCount,
  };
}
