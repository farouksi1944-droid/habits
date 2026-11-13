import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Sparkles,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  LineChart,
} from 'lucide-react';
import { Habit, HabitLog } from '../types';
import { getLastNDays, getArabicDayName, isHabitScheduledForDay } from '../lib/dateUtils';

export type AnalyticsPeriod = 'week' | 'month';

interface CommitmentTrendChartProps {
  habits: Habit[];
  logs: HabitLog[];
  period?: AnalyticsPeriod;
  onPeriodChange?: (period: AnalyticsPeriod) => void;
}

interface TrendPoint {
  key: string;
  dayName: string;
  displayDate: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
}

const CustomTrendTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendPoint }>;
}) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const pt = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-2xl bg-slate-900/95 border border-slate-700 px-3.5 py-2.5 shadow-xl text-right backdrop-blur-md"
    >
      <p className="text-[11px] font-semibold text-slate-400">
        {pt.dayName} ({pt.displayDate})
      </p>
      <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
        {pt.percentage}% التزام
      </p>
      <p className="text-[11px] text-slate-300 mt-0.5">
        تم إنجاز {pt.completedCount} من {pt.totalCount} عادات
      </p>
    </div>
  );
};

export const CommitmentTrendChart: React.FC<CommitmentTrendChartProps> = ({
  habits,
  logs,
  period: controlledPeriod,
  onPeriodChange,
}) => {
  const [internalPeriod, setInternalPeriod] = useState<AnalyticsPeriod>('month');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');

  const period = controlledPeriod ?? internalPeriod;
  const setPeriod = (next: AnalyticsPeriod) => {
    if (onPeriodChange) {
      onPeriodChange(next);
    } else {
      setInternalPeriod(next);
    }
  };

  const rangeDays = period === 'week' ? 7 : 30;
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // Compute daily data points for selected range (schedule-aware)
  const dataPoints = useMemo<TrendPoint[]>(() => {
    const days = getLastNDays(rangeDays, new Date());
    return days.map(day => {
      const scheduledForDay = activeHabits.filter(h => isHabitScheduledForDay(h, day.date));
      const targetCount = scheduledForDay.length;
      const completedForDay = scheduledForDay.filter(h =>
        logs.some(l => l.habitId === h.id && l.date === day.key && l.completed)
      ).length;

      const percentage =
        targetCount > 0 ? Math.round((completedForDay / targetCount) * 100) : 0;

      return {
        key: day.key,
        dayName: getArabicDayName(day.date),
        displayDate: `${day.date.getDate()}/${day.date.getMonth() + 1}`,
        completedCount: completedForDay,
        totalCount: targetCount,
        percentage,
      };
    });
  }, [rangeDays, activeHabits, logs]);

  const averagePercentage = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    const sum = dataPoints.reduce((acc, p) => acc + p.percentage, 0);
    return Math.round(sum / dataPoints.length);
  }, [dataPoints]);

  const totalCompletedInPeriod = useMemo(
    () => dataPoints.reduce((acc, p) => acc + p.completedCount, 0),
    [dataPoints]
  );

  const highestPercentage = useMemo(
    () => Math.max(...dataPoints.map(p => p.percentage), 0),
    [dataPoints]
  );

  const trendDirection = useMemo(() => {
    if (dataPoints.length < 4) return 'neutral';
    const mid = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, mid);
    const secondHalf = dataPoints.slice(mid);

    const avgFirst = firstHalf.reduce((a, b) => a + b.percentage, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b.percentage, 0) / secondHalf.length;

    if (avgSecond > avgFirst + 4) return 'up';
    if (avgSecond < avgFirst - 4) return 'down';
    return 'neutral';
  }, [dataPoints]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 text-right relative overflow-hidden shadow-xl">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Switchers: Period (Week vs Month) + Chart Type (Area vs Bar) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الأسبوع (7 أيام)
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الشهر (30 يوماً)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              title="عرض المنحنى"
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                chartStyle === 'area'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('bar')}
              title="عرض الأعمدة"
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                chartStyle === 'bar'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center justify-end gap-2">
              <span>
                {period === 'week'
                  ? 'اتجاهات إتمام العادات خلال الأسبوع'
                  : 'اتجاهات إتمام العادات على مدار الشهر'}
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              رسم بياني تفاعلي يوضح نسبة التزامك اليومية وإجمالي العادات المنجزة
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Summary Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <span className="block text-[11px] text-slate-400 font-medium">متوسط الالتزام</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-emerald-400 font-mono">
              %{averagePercentage}
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <span className="block text-[11px] text-slate-400 font-medium">مسار الأداء</span>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 text-xs font-bold">
              {trendDirection === 'up' && (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-4 h-4" />
                  تصاعدي ممتاز
                </span>
              )}
              {trendDirection === 'down' && (
                <span className="text-amber-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-4 h-4" />
                  يحتاج تعزيزاً
                </span>
              )}
              {trendDirection === 'neutral' && (
                <span className="text-blue-400">مستقر وثابت</span>
              )}
            </div>
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <span className="block text-[11px] text-slate-400 font-medium">أعلى التزام</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-blue-400 font-mono">
              %{highestPercentage}
            </span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <span className="block text-[11px] text-slate-400 font-medium">
            {period === 'week' ? 'إنجازات الأسبوع' : 'إنجازات الشهر'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-purple-400 font-mono">
              {totalCompletedInPeriod}
            </span>
            <span className="text-[11px] text-slate-400">إنجاز</span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Chart */}
      <div className="w-full h-72 pt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartStyle === 'area' ? (
            <AreaChart
              data={dataPoints}
              margin={{ top: 12, right: 14, left: -12, bottom: 4 }}
            >
              <defs>
                <linearGradient id="rechartsTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--color-slate-700)"
                strokeDasharray="4 4"
                vertical={false}
                opacity={0.35}
              />

              <XAxis
                dataKey="displayDate"
                stroke="var(--color-slate-400)"
                tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={period === 'month' ? 2 : 0}
              />

              <YAxis
                domain={[0, 100]}
                stroke="var(--color-slate-400)"
                tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `${val}%`}
              />

              <Tooltip content={<CustomTrendTooltip />} />

              {averagePercentage > 0 && (
                <ReferenceLine
                  y={averagePercentage}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
              )}

              <Area
                type="monotone"
                dataKey="percentage"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#rechartsTrendFill)"
                activeDot={{
                  r: 6,
                  fill: '#10b981',
                  stroke: 'var(--color-slate-900)',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={dataPoints}
              margin={{ top: 12, right: 14, left: -12, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--color-slate-700)"
                strokeDasharray="4 4"
                vertical={false}
                opacity={0.35}
              />

              <XAxis
                dataKey="displayDate"
                stroke="var(--color-slate-400)"
                tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={period === 'month' ? 2 : 0}
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
                content={<CustomTrendTooltip />}
              />

              {averagePercentage > 0 && (
                <ReferenceLine
                  y={averagePercentage}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
              )}

              <Bar
                dataKey="percentage"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={period === 'week' ? 38 : 16}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span>مرّر المؤشر فوق أي يوم لعرض نسبة الإنجاز وعدد العادات المكتملة</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>{period === 'week' ? 'نطاق 7 أيام' : 'نطاق 30 يوماً'}</span>
        </span>
      </div>
    </div>
  );
};
