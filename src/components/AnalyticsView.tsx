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
import { BarChart3, PieChart, Calendar, Target } from 'lucide-react';
import { Habit, HabitLog } from '../types';
import {
  getLastNDays,
  calculateStreak,
  getScheduledDaysArabic,
  calculateHabitPeriodCompletionRate,
} from '../lib/dateUtils';
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

  // Last 28 days heatmap
  const past28Days = getLastNDays(28, new Date());

  const habitStats = activeHabits.map(habit => {
    const habitLogs = logs.filter(l => l.habitId === habit.id && l.completed);
    const { current, longest } = calculateStreak(habit.id, logs, habit);
    const totalCompletions = habitLogs.length;
    const periodSummary = calculateHabitPeriodCompletionRate(habit, logs, periodDays);

    return {
      habit,
      totalCompletions,
      currentStreak: current,
      longestStreak: longest,
      completionRate: periodSummary.percentage,
      periodCompleted: periodSummary.completedCount,
      periodTarget: periodSummary.targetCount,
    };
  });

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
                className="flex flex-col items-center justify-between text-center p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all gap-3"
              >
                <CircularProgressRing
                  percentage={stat.completionRate}
                  size={74}
                  strokeWidth={6}
                  color={stat.habit.color}
                />

                <div className="w-full space-y-1">
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
                className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-4"
              >
                {/* Stats */}
                <div className="flex items-center gap-3">
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
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-bold text-slate-200">{stat.habit.name}</span>
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
