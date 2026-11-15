import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  BarChart3,
  PieChart,
  Calendar,
  Target,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  NotebookPen,
  CheckCircle2,
  HeartHandshake,
} from 'lucide-react';
import { Habit, HabitLog } from '../types';
import {
  toDateKey,
  getLastNDays,
  calculateStreak,
  getScheduledDaysArabic,
  getArabicDateDisplay,
  isHabitScheduledForDay,
  calculateHabitPeriodCompletionRate,
} from '../lib/dateUtils';
import {
  getEffectiveReminderTime,
  formatTimeArabic,
  timeStringToMinutes,
} from '../lib/notifications';
import { CommitmentTrendChart, AnalyticsPeriod } from './CommitmentTrendChart';
import { CircularProgressRing } from './CircularProgressRing';

interface AnalyticsViewProps {
  habits: Habit[];
  logs: HabitLog[];
}

interface HabitBarItem {
  name: string;
  shortName: string;
  completionRate: number;
  completed: number;
  target: number;
  color: string;
}

const HabitBarTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: HabitBarItem }>;
}) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-2xl bg-slate-900/95 border border-slate-700 px-3.5 py-2.5 shadow-xl text-right backdrop-blur-md"
    >
      <p className="text-xs font-bold text-slate-100">{item.name}</p>
      <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
        {item.completionRate}%
      </p>
      <p className="text-[11px] text-slate-300 mt-0.5">
        {item.completed} من أصل {item.target} أيام مستهدفة
      </p>
    </div>
  );
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ habits, logs }) => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const activeHabits = habits.filter(h => !h.archived);
  const periodDays = period === 'week' ? 7 : 30;

  const now = new Date();
  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Last 28 days heatmap
  const past28Days = getLastNDays(28, now);

  const habitStats = activeHabits.map(habit => {
    const habitLogs = logs.filter(l => l.habitId === habit.id && l.completed);
    const { current, longest } = calculateStreak(habit.id, logs, habit);
    const totalCompletions = habitLogs.length;
    const periodSummary = calculateHabitPeriodCompletionRate(habit, logs, periodDays);

    const isScheduledToday = isHabitScheduledForDay(habit, now);
    const completedToday = logs.some(
      l => l.habitId === habit.id && l.date === todayKey && l.completed
    );
    const reminderTime = getEffectiveReminderTime(habit);

    let warningMessage: string | null = null;
    let shortWarningLabel: string | null = null;
    let isUrgentWarning = false;

    if (isScheduledToday && !completedToday) {
      if (reminderTime) {
        const targetMinutes = timeStringToMinutes(reminderTime);
        if (targetMinutes >= 0 && nowMinutes > targetMinutes) {
          warningMessage = `تحذير: فات موعد العادة (${formatTimeArabic(reminderTime)}) ولم تقم بها بعد!`;
          shortWarningLabel = 'فات الموعد!';
          isUrgentWarning = true;
        } else if (targetMinutes >= 0 && nowMinutes >= targetMinutes - 60) {
          warningMessage = `تنبيه: اقترب موعد العادة (${formatTimeArabic(reminderTime)}) ولم تُنجز بعد!`;
          shortWarningLabel = 'اقترب الموعد';
        } else {
          warningMessage = 'تنبيه: لم تقم بإنجاز هذه العادة اليوم بعد.';
          shortWarningLabel = 'لم تُنجز اليوم';
        }
      } else {
        warningMessage = 'تنبيه: لم تقم بإنجاز هذه العادة اليوم بعد.';
        shortWarningLabel = 'لم تُنجز اليوم';
      }
    } else if (periodSummary.percentage < 40) {
      warningMessage = `تنبيه: نسبة التزامك في هذه العادة منخفضة (${periodSummary.percentage}%).`;
      shortWarningLabel = 'التزام منخفض';
    }

    return {
      habit,
      totalCompletions,
      currentStreak: current,
      longestStreak: longest,
      completionRate: periodSummary.percentage,
      periodCompleted: periodSummary.completedCount,
      periodTarget: periodSummary.targetCount,
      completedToday,
      isScheduledToday,
      warningMessage,
      shortWarningLabel,
      isUrgentWarning,
    };
  });

  const uncompletedTodayStats = habitStats.filter(
    s => s.isScheduledToday && !s.completedToday
  );
  const scheduledTodayStats = habitStats.filter(s => s.isScheduledToday);
  const completedTodayStats = scheduledTodayStats.filter(s => s.completedToday);
  const todayPercentage =
    scheduledTodayStats.length > 0
      ? Math.round((completedTodayStats.length / scheduledTodayStats.length) * 100)
      : 0;
  const overdueTodayStats = uncompletedTodayStats.filter(s => s.isUrgentWarning);

  // Today's notes & recent notes
  const todayNotes = logs
    .filter(l => l.date === todayKey && Boolean(l.notes && l.notes.trim()))
    .map(l => {
      const h = habits.find(item => item.id === l.habitId);
      return {
        habitId: l.habitId,
        habitName: h?.name || l.habitName,
        color: h?.color || '#10b981',
        note: (l.notes || '').trim(),
        completed: l.completed,
        date: l.date,
      };
    });

  const recentNotes =
    todayNotes.length > 0
      ? todayNotes
      : logs
          .filter(l => Boolean(l.notes && l.notes.trim()))
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 4)
          .map(l => {
            const h = habits.find(item => item.id === l.habitId);
            return {
              habitId: l.habitId,
              habitName: h?.name || l.habitName,
              color: h?.color || '#10b981',
              note: (l.notes || '').trim(),
              completed: l.completed,
              date: l.date,
            };
          });

  // Overall period stats & streaks
  const avgPeriodRate =
    habitStats.length > 0
      ? Math.round(
          habitStats.reduce((sum, s) => sum + s.completionRate, 0) / habitStats.length
        )
      : 0;
  const activeStreaks = habitStats.filter(s => s.currentStreak > 0);
  const bestStreakStat = habitStats
    .slice()
    .sort((a, b) => b.currentStreak - a.currentStreak)[0];
  const bestPerformingStat = habitStats
    .slice()
    .sort((a, b) => b.completionRate - a.completionRate)[0];
  const weakPerformingStats = habitStats
    .filter(s => s.completionRate < 50)
    .sort((a, b) => a.completionRate - b.completionRate);

  const last7Days = getLastNDays(7, now);
  const zeroCompletionDaysLastWeek = last7Days.filter(
    day => !logs.some(l => l.date === day.key && l.completed)
  ).length;
  const habitsWithoutReminder = activeHabits.filter(
    h => !getEffectiveReminderTime(h)
  ).length;

  // Thank-you & motivational message tailored to real progress
  let appreciationTitle = 'شكراً لحرصك على متابعة تقدمك — الوقت ما زال أمامك!';
  let appreciationBody =
    'كل خطوة صغيرة اليوم تفتح باباً لإنجاز أكبر غداً. اختر عادة واحدة متبقية الآن وابدأ بها لتصنع فارقاً فورياً في يومك.';

  if (scheduledTodayStats.length > 0 && todayPercentage === 100) {
    appreciationTitle = 'شكراً لك على التزامك الكامل وإصرارك الرائع اليوم!';
    appreciationBody = `أنجزت جميع عاداتك المجدولة لليوم (${completedTodayStats.length}/${scheduledTodayStats.length}) بنسبة 100%. هذا الانضباط المستمر هو سر التفوق — استثمر هذا الزخم في تطوير أهدافك أكثر!`;
  } else if (todayPercentage >= 70) {
    appreciationTitle = 'شكراً على جهدك المميز اليوم — لم يتبقَّ سوى القليل للقمة!';
    appreciationBody = `حققت ${todayPercentage}% من مهام اليوم (${completedTodayStats.length} من ${scheduledTodayStats.length}). دفعة بسيطة الآن تكفي لإنهاء اليوم بأعلى درجة ممكنة!`;
  } else if (todayPercentage >= 35 || avgPeriodRate >= 60) {
    appreciationTitle = 'شكراً لخطواتك الإيجابية — تذكّر أن القادم يستحق مجهوداً أكبر!';
    appreciationBody = `أتممت ${completedTodayStats.length} عادات اليوم بمعدل التزام عام ${avgPeriodRate}%. لا تتوقف عند المنتصف؛ ركّز على عادة أخرى الآن لتضاعف نتيجتك.`;
  }

  // Computed Positives (الإيجابيات)
  const positives: string[] = [];
  if (completedTodayStats.length > 0) {
    positives.push(
      `تم إنجاز ${completedTodayStats.length} من أصل ${scheduledTodayStats.length} عادات مجدولة لليوم (${todayPercentage}%).`
    );
  }
  if (bestPerformingStat && bestPerformingStat.completionRate >= 50) {
    positives.push(
      `أعلى التزام في الفترة الحالية: «${bestPerformingStat.habit.name}» بنسبة ${bestPerformingStat.completionRate}%.`
    );
  }
  if (activeStreaks.length > 0 && bestStreakStat) {
    positives.push(
      `لديك ${activeStreaks.length} عادات بسلاسل مستمرة، أبرزها «${bestStreakStat.habit.name}» (${bestStreakStat.currentStreak} أيام متتالية).`
    );
  }
  if (todayNotes.length > 0) {
    positives.push(
      `سجّلت ${todayNotes.length} تدوينات وملاحظات يومية اليوم، مما يعزز الوعي الذاتي.`
    );
  }
  if (positives.length === 0) {
    positives.push(
      `متابعتك المنتظمة في قسم التحليلات خطوة إيجابية ممتازة لتقييم يومك والانطلاق بقوة.`
    );
  }

  // Computed Negatives & Shortcomings (السلبيات والنقائص)
  const negativesAndGaps: string[] = [];
  if (overdueTodayStats.length > 0) {
    negativesAndGaps.push(
      `فات موعد ${overdueTodayStats.length} عادات اليوم ولم تُنجز بعد: ${overdueTodayStats
        .map(s => s.habit.name)
        .join('، ')}.`
    );
  }
  const pendingNotOverdueCount = uncompletedTodayStats.length - overdueTodayStats.length;
  if (pendingNotOverdueCount > 0) {
    negativesAndGaps.push(
      `ما زالت هناك ${pendingNotOverdueCount} عادات مجدولة لليوم بانتظار التنفيذ.`
    );
  }
  if (weakPerformingStats.length > 0) {
    const lowest = weakPerformingStats[0];
    negativesAndGaps.push(
      `انخفاض معدل الالتزام في «${lowest.habit.name}» (${lowest.completionRate}%) ويحتاج إلى متابعة أكبر.`
    );
  }
  if (zeroCompletionDaysLastWeek > 0) {
    negativesAndGaps.push(
      `مضى ${zeroCompletionDaysLastWeek} أيام خلال آخر أسبوع دون تسجيل أي إنجاز.`
    );
  }
  if (todayNotes.length === 0 && activeHabits.length > 0) {
    negativesAndGaps.push(
      'لم تُكتب ملاحظات أو تدوينات لليوم بعد (كتابة سطر واحد تساعدك على مراجعة تقدمك).'
    );
  }
  if (habitsWithoutReminder > 0) {
    negativesAndGaps.push(
      `${habitsWithoutReminder} من عاداتك بدون وقت تذكير محدد، وقد يفيد ضبط وقت لها لعدم نسيانها.`
    );
  }
  if (negativesAndGaps.length === 0) {
    negativesAndGaps.push(
      'لا توجد سلبيات أو نقائص مسجلة اليوم — أداء متوازن ومكتمل!'
    );
  }

  const barChartData: HabitBarItem[] = habitStats.map(stat => ({
    name: stat.habit.name,
    shortName:
      stat.habit.name.length > 14
        ? `${stat.habit.name.slice(0, 14)}…`
        : stat.habit.name,
    completionRate: stat.completionRate,
    completed: stat.periodCompleted,
    target: stat.periodTarget,
    color: stat.habit.color,
  }));

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  logs
    .filter(l => l.completed)
    .forEach(l => {
      const h = habits.find(habit => habit.id === l.habitId);
      if (h) {
        categoryCounts[h.category] = (categoryCounts[h.category] || 0) + 1;
      }
    });

  const CATEGORY_LABELS: Record<string, string> = {
    health: 'صحة ولياقة 🏃',
    spiritual: 'عبادة وروحانيات 🕌',
    learning: 'تعلم وقراءة 📚',
    productivity: 'إنتاجية وعمل 💼',
    wellness: 'نمط حياة وعافية 🌿',
    finance: 'مالية وتوفير 💰',
  };

  return (
    <div className="space-y-6 text-right">
      {/* Appreciation, Motivation & Today's Executive Summary */}
      <section
        aria-label="ملخص اليوم والتقييم التحفيزي"
        className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5"
      >
        {/* Thank-You & Push-to-Work-More Banner */}
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>رسالة شكر وتحفيز</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400 font-normal">{getArabicDateDisplay(now)}</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 leading-snug">
                {appreciationTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {appreciationBody}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 px-4 py-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold">إنجاز اليوم</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {todayPercentage}%
            </span>
          </div>
        </div>

        {/* Today's Summary Strip */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 mb-2.5 flex items-center justify-end gap-1.5">
            <span>ملخص اليوم السريع</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">العادات المنجزة اليوم</span>
              <span className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-0.5 block">
                {completedTodayStats.length} / {scheduledTodayStats.length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">النقائص المتبقية اليوم</span>
              <span
                className={`text-lg font-black font-mono tabular-nums mt-0.5 block ${
                  overdueTodayStats.length > 0
                    ? 'text-red-400'
                    : uncompletedTodayStats.length > 0
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {uncompletedTodayStats.length}
                {overdueTodayStats.length > 0 && (
                  <span className="text-[11px] font-bold mr-1.5">
                    ({overdueTodayStats.length} متأخرة)
                  </span>
                )}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">الملاحظات المدونة اليوم</span>
              <span className="text-lg font-black text-blue-400 font-mono tabular-nums mt-0.5 block">
                {todayNotes.length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">متوسط الالتزام ({period === 'week' ? '7 أيام' : '30 يوماً'})</span>
              <span className="text-lg font-black text-purple-400 font-mono tabular-nums mt-0.5 block">
                {avgPeriodRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Positives vs Negatives & Shortcomings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Positives */}
          <div className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2.5">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-2">
              <span>الإيجابيات ونقاط القوة</span>
              <ThumbsUp className="w-4 h-4 shrink-0" />
            </h4>
            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
              {positives.map((item, idx) => (
                <li key={idx} className="flex items-start justify-end gap-2">
                  <span>{item}</span>
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Negatives & Shortcomings */}
          <div className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center justify-end gap-2">
              <span>السلبيات والنقائص للتحسين</span>
              <ThumbsDown className="w-4 h-4 shrink-0" />
            </h4>
            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
              {negativesAndGaps.map((item, idx) => (
                <li key={idx} className="flex items-start justify-end gap-2">
                  <span>{item}</span>
                  <span className="text-amber-400 font-bold shrink-0">!</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Today's / Recent Notes Section */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400">
              {todayNotes.length > 0
                ? `${todayNotes.length} ملاحظات مسجلة اليوم`
                : recentNotes.length > 0
                  ? 'أحدث الملاحظات من الأيام السابقة'
                  : 'لا توجد ملاحظات مسجلة بعد'}
            </span>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>{todayNotes.length > 0 ? 'ملاحظات وتدوينات اليوم' : 'سجل الملاحظات'}</span>
              <NotebookPen className="w-4 h-4 text-blue-400" />
            </h4>
          </div>

          {recentNotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentNotes.map((entry, idx) => (
                <div
                  key={`${entry.habitId}-${entry.date}-${idx}`}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-right"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 font-mono">{entry.date}</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 truncate">
                      <span>{entry.habitName}</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{entry.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              لم تكتب أي ملاحظة بعد. أضف تدوينة قصيرة داخل أي بطاقة عادة لتظهر هنا ضمن ملخصك اليومي.
            </p>
          )}
        </div>
      </section>

      {/* Warning Summary for Uncompleted Habits Today */}
      {uncompletedTodayStats.length > 0 && (
        <div
          role="status"
          className="rounded-3xl bg-amber-500/10 border border-amber-500/35 p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-amber-400">
              {uncompletedTodayStats.length} عادات متبقية اليوم
            </span>
            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
              <span>تحذير: عادات مجدولة لليوم لم تقم بإنجازها بعد</span>
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {uncompletedTodayStats.map(stat => (
              <div
                key={stat.habit.id}
                className={`px-3 py-2 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                  stat.isUrgentWarning
                    ? 'bg-red-500/10 border-red-500/35 text-red-300'
                    : 'bg-slate-950/60 border-amber-500/25 text-slate-200'
                }`}
              >
                <span
                  className={`text-[11px] font-bold shrink-0 ${
                    stat.isUrgentWarning ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {stat.shortWarningLabel}
                </span>
                <span className="font-bold truncate">{stat.habit.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Recharts Commitment Curve / Bar Trend Chart (Week / Month Toggle) */}
      <CommitmentTrendChart
        habits={habits}
        logs={logs}
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Interactive Recharts Habit Comparison Bar Chart */}
      {barChartData.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-slate-400">
              مقارنة نسبة إتمام كل عادة خلال {period === 'week' ? 'آخر 7 أيام' : 'آخر 30 يوماً'}
            </span>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>مقارنة أداء العادات (Recharts)</span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </h3>
          </div>

          <div className="w-full h-64 pt-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 16, left: -12, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="var(--color-slate-700)"
                  strokeDasharray="4 4"
                  vertical={false}
                  opacity={0.35}
                />
                <XAxis
                  dataKey="shortName"
                  stroke="var(--color-slate-400)"
                  tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--color-slate-400)"
                  tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => `${val}%`}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-slate-800)', opacity: 0.35 }}
                  content={<HabitBarTooltip />}
                />
                <Bar
                  dataKey="completionRate"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                >
                  {barChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Organized Grid of Circular Percentage Rings for Every Habit */}
      {habitStats.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-slate-400">
              نسبة الإنجاز لكل عادة خلال {period === 'week' ? 'آخر 7 أيام' : 'آخر 30 يوماً'}
            </span>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>الدوائر النسبية لكل عادة</span>
              <Target className="w-4 h-4 text-emerald-400" />
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
            {habitStats.map(stat => (
              <div
                key={stat.habit.id}
                className={`flex flex-col items-center justify-between text-center p-4 rounded-2xl bg-slate-950/60 border transition-all gap-3 ${
                  stat.isUrgentWarning
                    ? 'border-red-500/40 hover:border-red-500/60'
                    : stat.shortWarningLabel
                      ? 'border-amber-500/30 hover:border-amber-500/50'
                      : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <CircularProgressRing
                  percentage={stat.completionRate}
                  size={74}
                  strokeWidth={6}
                  color={stat.habit.color}
                />

                <div className="w-full space-y-1.5">
                  <p className="text-xs font-bold text-slate-200 line-clamp-2 min-h-[2rem] flex items-center justify-center">
                    {stat.habit.name}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>
                      {stat.periodCompleted}/{stat.periodTarget}
                    </span>
                    {stat.currentStreak > 0 && (
                      <span className="text-amber-400 font-bold">🔥 {stat.currentStreak}</span>
                    )}
                  </div>
                  {stat.shortWarningLabel && (
                    <div
                      className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                        stat.isUrgentWarning
                          ? 'bg-red-500/10 border-red-500/35 text-red-300'
                          : 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{stat.shortWarningLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 28-Day Consistency Heatmap */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>أقل</span>
            <div className="w-3 h-3 rounded bg-slate-800" />
            <div className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800" />
            <div className="w-3 h-3 rounded bg-emerald-700" />
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <div className="w-3 h-3 rounded bg-emerald-300" />
            <span>أكثر</span>
          </div>

          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>خريطة الالتزام لآخر 28 يوماً</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </h3>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {past28Days.map(day => {
            const countForDay = logs.filter(l => l.date === day.key && l.completed).length;
            const intensity =
              countForDay === 0
                ? 0
                : Math.min(4, Math.ceil((countForDay / Math.max(1, activeHabits.length)) * 4));

            const colors = [
              'bg-slate-800/60 border border-slate-700/40 text-slate-400',
              'bg-emerald-950/80 border border-emerald-800/60 text-emerald-400',
              'bg-emerald-800/80 text-emerald-200',
              'bg-emerald-600 text-white font-bold',
              'bg-emerald-500 text-white font-black',
            ];

            return (
              <div
                key={day.key}
                title={`${day.key}: ${countForDay} عادات مكتملة`}
                className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 transition-transform hover:scale-110 cursor-pointer ${colors[intensity]}`}
              >
                <span className="text-[10px] opacity-75">{day.date.getDate()}</span>
                <span className="text-[11px] font-mono">{countForDay}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Habit Leaderboard & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Habit Performance List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center justify-end gap-2">
            <span>ترتيب أداء العادات</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </h3>

          <div className="space-y-3">
            {habitStats.map(stat => (
              <div
                key={stat.habit.id}
                className={`p-3.5 rounded-2xl bg-slate-950/50 border flex items-center justify-between gap-4 ${
                  stat.isUrgentWarning
                    ? 'border-red-500/35'
                    : stat.warningMessage
                      ? 'border-amber-500/25'
                      : 'border-slate-800/80'
                }`}
              >
                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center px-2 py-1 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-xs font-mono font-bold text-emerald-400">
                      {stat.totalCompletions}
                    </span>
                    <span className="text-[10px] text-slate-400">إنجاز</span>
                  </div>

                  <div className="text-center px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="block text-xs font-mono font-bold text-amber-400">
                      {stat.longestStreak}
                    </span>
                    <span className="text-[10px] text-amber-300">أيام متتالية</span>
                  </div>
                </div>

                {/* Habit title & bar */}
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-bold text-slate-200 truncate">{stat.habit.name}</span>
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stat.habit.color }}
                    />
                  </div>
                  {stat.habit.scheduleType === 'specific_days' && (
                    <span className="text-[11px] text-blue-400 block mt-0.5">
                      📅 {getScheduledDaysArabic(stat.habit.targetDays)}
                    </span>
                  )}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.completionRate}%`,
                        backgroundColor: stat.habit.color,
                      }}
                    />
                  </div>
                  {stat.warningMessage && (
                    <div
                      className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                        stat.isUrgentWarning
                          ? 'bg-red-500/10 border-red-500/35 text-red-300'
                          : 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-3 h-3 shrink-0 ${
                          stat.isUrgentWarning ? 'text-red-400' : 'text-amber-400'
                        }`}
                      />
                      <span>{stat.warningMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center justify-end gap-2">
            <span>توزيع الإنجازات حسب المجال</span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </h3>

          <div className="space-y-3 pt-2">
            {Object.keys(CATEGORY_LABELS).map(catKey => {
              const count = categoryCounts[catKey] || 0;
              const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={catKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">
                      {count} ({pct}%)
                    </span>
                    <span className="font-medium text-slate-300">{CATEGORY_LABELS[catKey]}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
