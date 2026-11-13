import React, { useState, useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
  Trophy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  Lock,
} from 'lucide-react';
import { Habit, HabitLog } from '../types';
import { toDateKey, calculateStreak, isHabitScheduledForDay } from '../lib/dateUtils';
import { calculateGamification, XP_RULES } from '../lib/gamification';

interface StatsCardsProps {
  habits: Habit[];
  logs: HabitLog[];
  selectedDate: Date;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ habits, logs, selectedDate }) => {
  const [showLevelDetails, setShowLevelDetails] = useState(false);

  const activeHabits = habits.filter(h => !h.archived);
  const selectedDateKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const isSelectedToday = selectedDateKey === todayKey;

  // Active habits scheduled for the selected day
  const scheduledForDay = activeHabits.filter(h => isHabitScheduledForDay(h, selectedDate));
  
  // Completed today among scheduled habits (or all if completed)
  const completedCount = scheduledForDay.filter(h => 
    logs.some(l => l.habitId === h.id && l.date === selectedDateKey && l.completed)
  ).length;

  const totalScheduled = scheduledForDay.length;
  const totalActive = activeHabits.length;
  const completionPercentage = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;

  // Overall longest streak across all habits (schedule-aware)
  let maxStreak = 0;
  let activeStreaksCount = 0;
  activeHabits.forEach(h => {
    const { current, longest } = calculateStreak(h.id, logs, h);
    if (longest > maxStreak) maxStreak = longest;
    if (current > 0) activeStreaksCount++;
  });

  // Total completions recorded in Sheets
  const totalCompletedLogs = logs.filter(l => l.completed).length;

  // Gamification & User Level computation
  const gamification = useMemo(
    () => calculateGamification(habits, logs),
    [habits, logs]
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* User Level & Gamification Dashboard Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden transition-all hover:border-amber-500/35">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Right side (RTL): Level Badge & Rank Title */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gamification.rank.accentGradient} flex flex-col items-center justify-center text-white shadow-lg shrink-0`}
            >
              <Trophy className="w-5 h-5" />
              <span className="text-[11px] font-black font-mono leading-none mt-1">
                LV.{gamification.level}
              </span>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-400">مستوى المستخدم</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${gamification.rank.badgeBg} ${gamification.rank.badgeBorder} ${gamification.rank.badgeText}`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{gamification.rank.title}</span>
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-100">
                  المستوى {gamification.level}
                </h3>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  • {gamification.totalXP.toLocaleString('en-US')} نقطة XP
                </span>
              </div>
            </div>
          </div>

          {/* Center: Level Progress Bar */}
          <div className="flex-1 lg:max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                التقدم نحو المستوى {gamification.level + 1}
              </span>
              <span className="font-mono font-bold text-slate-200" dir="ltr">
                {gamification.xpIntoLevel} / {gamification.xpForNextLevel} XP ({gamification.levelProgressPercent}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-l ${gamification.rank.barGradient} transition-all duration-500`}
                style={{ width: `${gamification.levelProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>متبقي {gamification.xpRemaining} نقطة للمستوى التالي</span>
              <span>
                {gamification.stats.perfectDaysCount} يوم مثالي • {gamification.unlockedAchievementsCount}/{gamification.achievements.length} شارات
              </span>
            </div>
          </div>

          {/* Left side (RTL): Quick Details Toggle */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowLevelDetails(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>تفاصيل النقاط والشارات</span>
              {showLevelDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable XP Breakdown & Achievement Badges */}
        {showLevelDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in">
            {/* XP Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-400 block">إتمام العادات</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  +{gamification.breakdown.completionXP + gamification.breakdown.partialGoalXP} XP
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  +{XP_RULES.PER_COMPLETION} لكل عادة مكتملة
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-400 block">الأيام المثالية</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  +{gamification.breakdown.perfectDaysXP} XP
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  +{XP_RULES.PER_PERFECT_DAY} عند إتمام يوم كامل
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-400 block">سلاسل الانتظام</span>
                <span className="text-sm font-black text-blue-400 font-mono">
                  +{gamification.breakdown.streakXP} XP
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  +{XP_RULES.PER_STREAK_DAY} لكل يوم سلسلة نشطة
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-400 block">التدوينات اليومية</span>
                <span className="text-sm font-black text-purple-400 font-mono">
                  +{gamification.breakdown.notesXP} XP
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  +{XP_RULES.PER_NOTE} لكل ملاحظة مسجلة
                </span>
              </div>
            </div>

            {/* Achievements Badges */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">شارات الإنجاز</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {gamification.unlockedAchievementsCount} / {gamification.achievements.length} مكتسبة
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {gamification.achievements.map(badge => (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={`p-2.5 rounded-2xl border text-right transition-all ${
                      badge.unlocked
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-slate-100'
                        : 'bg-slate-950/50 border-slate-800/70 text-slate-400 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold truncate">{badge.title}</span>
                      {badge.unlocked ? (
                        <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 Core Dashboard KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Today's / Selected Day Progress */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-slate-100 font-mono">
              {completionPercentage}%
            </span>
          </div>

          <div className="mt-3 text-right">
            <h4 className="text-xs font-medium text-slate-400">
              {isSelectedToday ? 'إنجاز عادات اليوم المجدولة' : 'إنجاز اليوم المحدد'}
            </h4>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              {completedCount} من {totalScheduled} عادات مجدولة
            </p>
          </div>

          {/* Mini progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* 2. Top Streak */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-amber-400 font-mono">
              {maxStreak} <span className="text-xs font-normal text-amber-300">أيام</span>
            </span>
          </div>

          <div className="mt-3 text-right">
            <h4 className="text-xs font-medium text-slate-400">أطول سلسلة متواصلة</h4>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              {activeStreaksCount > 0 ? `${activeStreaksCount} عادات نشطة حالياً` : 'ابدأ سلسلتك اليوم'}
            </p>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (maxStreak / 21) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Total Recorded Completions */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-blue-400 font-mono">
              {totalCompletedLogs}
            </span>
          </div>

          <div className="mt-3 text-right">
            <h4 className="text-xs font-medium text-slate-400">إجمالي الإنجازات</h4>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              مسجلة في Google Sheets
            </p>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (totalCompletedLogs / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4. Active Habits Count */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-purple-400 font-mono">
              {totalActive}
            </span>
          </div>

          <div className="mt-3 text-right">
            <h4 className="text-xs font-medium text-slate-400">العادات قيد المتابعة</h4>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              منتظمة في روتينك
            </p>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (totalActive / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

