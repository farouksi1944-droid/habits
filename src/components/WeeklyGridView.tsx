import React from 'react';
import { Check, Flame, Trophy } from 'lucide-react';
import { Habit, HabitLog } from '../types';
import { 
  getLastNDays, 
  getArabicDayName, 
  toDateKey,
  isHabitScheduledForDay,
  getScheduledDaysArabic
} from '../lib/dateUtils';

interface WeeklyGridViewProps {
  habits: Habit[];
  logs: HabitLog[];
  selectedDate: Date;
  onToggleComplete: (habit: Habit, dateKey: string, completed: boolean) => void;
}

export const WeeklyGridView: React.FC<WeeklyGridViewProps> = ({
  habits,
  logs,
  selectedDate,
  onToggleComplete,
}) => {
  const activeHabits = habits.filter(h => !h.archived);
  const weekDays = getLastNDays(7, selectedDate);
  const todayKey = toDateKey(new Date());

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 overflow-hidden text-right">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-wrap gap-2">
        <span className="text-xs text-slate-400">
          انقر على أي خلية لتسجيل أو إلغاء إنجاز العادة في ذلك اليوم
        </span>
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>نظرة الأسبوع الشاملة (7 أيام)</span>
          <Trophy className="w-4 h-4 text-amber-400" />
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-right border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-400">
              <th className="py-3 px-3 font-semibold text-right">العادة</th>
              <th className="py-3 px-2 font-semibold text-center w-24">الإنجاز</th>
              {weekDays.map(day => (
                <th key={day.key} className="py-3 px-2 text-center font-medium">
                  <div className={`inline-flex flex-col items-center px-2 py-1 rounded-xl ${day.key === todayKey ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400'}`}>
                    <span className="text-[11px]">{getArabicDayName(day.date)}</span>
                    <span className="text-[10px] opacity-75">{day.date.getDate()}/{day.date.getMonth() + 1}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {activeHabits.map(habit => {
              // Count completed days in this 7-day window
              const completedInWeek = weekDays.filter(day => 
                logs.some(l => l.habitId === habit.id && l.date === day.key && l.completed)
              ).length;
              const metTarget = completedInWeek >= (habit.weeklyTarget || 7);

              return (
                <tr key={habit.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Habit name & color */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: habit.color }}
                      />
                      <span className="text-sm font-bold text-slate-200 block">
                        {habit.name}
                      </span>
                      {habit.scheduleType === 'specific_days' && (
                        <span className="text-[10px] text-blue-400 block">
                          📅 {getScheduledDaysArabic(habit.targetDays)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Weekly progress badge */}
                  <td className="py-3.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                      metTarget 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      <span>{completedInWeek} / {habit.weeklyTarget}</span>
                    </span>
                  </td>

                  {/* 7 Days checkboxes */}
                  {weekDays.map(day => {
                    const isDone = logs.some(l => l.habitId === habit.id && l.date === day.key && l.completed);
                    const isScheduled = isHabitScheduledForDay(habit, day.date);

                    return (
                      <td key={day.key} className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(habit, day.key, !isDone)}
                          title={`${habit.name} - ${day.key}: ${isDone ? 'مكتمل' : isScheduled ? 'مطلوب لليوم' : 'غير مجدول لهذا اليوم'}`}
                          className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer relative ${
                            isDone
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                              : isScheduled
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-blue-500/30'
                                : 'bg-slate-900/40 hover:bg-slate-800/40 text-slate-600 border border-dashed border-slate-800'
                          }`}
                        >
                          <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                          {!isDone && isScheduled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 absolute top-1 right-1" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
