import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Flame, 
  Edit3, 
  Trash2, 
  Clock, 
  MessageSquare, 
  Bell,
  Plus,
  Minus,
  NotebookPen,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Habit, HabitLog } from '../types';
import { 
  toDateKey, 
  calculateStreak, 
  getLastNDays, 
  getArabicDayName,
  isHabitScheduledForDay,
  getScheduledDaysArabic,
  calculateHabitPeriodCompletionRate
} from '../lib/dateUtils';
import { getEffectiveReminderTime, formatTimeArabic } from '../lib/notifications';
import { CircularProgressRing } from './CircularProgressRing';

interface HabitCardProps {
  habit: Habit;
  logs: HabitLog[];
  selectedDate: Date;
  focusMode?: boolean;
  onToggleComplete: (habit: Habit, dateKey: string, completed: boolean, notes?: string, progressValue?: number) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  health: 'صحة ولياقة',
  spiritual: 'عبادة وروحانيات',
  learning: 'تعلم وقراءة',
  productivity: 'إنتاجية وعمل',
  wellness: 'نمط حياة وعافية',
  finance: 'مالية وتوفير',
};

const TIME_NAMES: Record<string, string> = {
  morning: 'صباحاً',
  afternoon: 'ظهراً',
  evening: 'مساءً',
  anytime: 'أي وقت',
};

const roundClean = (n: number): number => Math.round(n * 100) / 100;

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  logs,
  selectedDate,
  focusMode = false,
  onToggleComplete,
  onEditHabit,
  onDeleteHabit,
}) => {
  const [showNotesInput, setShowNotesInput] = useState(false);
  const selectedDateKey = toDateKey(selectedDate);

  // Check log on selected date
  const selectedLog = logs.find(l => l.habitId === habit.id && l.date === selectedDateKey);
  const isNumericGoal = habit.goalType === 'numeric' && (habit.goalTarget ?? 0) > 0;
  const goalTarget = habit.goalTarget || 1;
  const goalUnit = habit.goalUnit || 'مرة';
  const goalStep = habit.goalStep || (goalTarget <= 3 ? 0.25 : goalTarget >= 20 ? 5 : 1);

  const currentProgress = isNumericGoal
    ? selectedLog?.progressValue !== undefined
      ? selectedLog.progressValue
      : selectedLog?.completed
        ? goalTarget
        : 0
    : 0;

  const isCompleted = isNumericGoal
    ? currentProgress >= goalTarget || Boolean(selectedLog?.completed)
    : Boolean(selectedLog?.completed);

  const goalPercentage = isNumericGoal
    ? Math.min(100, Math.round((currentProgress / goalTarget) * 100))
    : 0;

  const [noteText, setNoteText] = useState(selectedLog?.notes || '');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  useEffect(() => {
    setNoteText(selectedLog?.notes || '');
  }, [selectedDateKey, selectedLog?.notes]);

  useEffect(() => {
    setShowNotesInput(false);
    setNoteSavedFeedback(false);
  }, [selectedDateKey]);

  // Calculate streaks (accounting for specific scheduled days)
  const { current: currentStreak } = calculateStreak(habit.id, logs, habit);

  // Last 7 days & weekly completion rate
  const last7Days = getLastNDays(7, selectedDate);
  const { percentage: weeklyPercentage, completedCount: weeklyDone, targetCount: weeklyTargetCount } =
    calculateHabitPeriodCompletionRate(habit, logs, 7, selectedDate);
  const reminderTime = getEffectiveReminderTime(habit);

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: [habit.color, '#10b981', '#34d399', '#f59e0b'],
      });
    } catch {
      // Fallback gracefully if canvas is unavailable
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isCompleted;
    if (nextState) {
      fireCelebration();
      // Smoothly reveal the optional daily journal/notes field when completing the habit
      if (!selectedLog?.notes) {
        setShowNotesInput(true);
      }
    }
    const nextProgress = isNumericGoal ? (nextState ? goalTarget : 0) : undefined;
    onToggleComplete(habit, selectedDateKey, nextState, noteText.trim(), nextProgress);
  };

  const handleStepGoal = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!isNumericGoal) return;
    const nextValue = Math.max(0, roundClean(currentProgress + delta));
    const nextCompleted = nextValue >= goalTarget;
    if (nextCompleted && !isCompleted) {
      fireCelebration();
      if (!selectedLog?.notes) {
        setShowNotesInput(true);
      }
    }
    onToggleComplete(habit, selectedDateKey, nextCompleted, noteText.trim(), nextValue);
  };

  const handleSaveNotes = () => {
    const trimmed = noteText.trim();
    onToggleComplete(
      habit,
      selectedDateKey,
      isCompleted,
      trimmed,
      isNumericGoal ? currentProgress : undefined
    );
    setNoteText(trimmed);
    setShowNotesInput(false);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2200);
  };

  const handleClearNotes = () => {
    setNoteText('');
    onToggleComplete(
      habit,
      selectedDateKey,
      isCompleted,
      '',
      isNumericGoal ? currentProgress : undefined
    );
    setShowNotesInput(false);
  };

  return (
    <div 
      className={`rounded-3xl border transition-all duration-300 relative overflow-hidden text-right ${
        focusMode ? 'p-4 sm:p-5' : 'p-5'
      } ${
        isCompleted
          ? focusMode
            ? 'bg-slate-900/55 border-emerald-500/30 opacity-75'
            : 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Accent left colored bar */}
      <div 
        className="absolute top-0 right-0 w-1.5 h-full"
        style={{ backgroundColor: habit.color }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Right side in RTL (Habit Info & Completion + Numeric Goal Progress Bar) */}
        <div className="flex items-start gap-3.5 pr-2 flex-1 min-w-0">
          {/* Main Completion Button */}
          <button
            onClick={handleToggle}
            className={`${focusMode ? 'w-13 h-13' : 'w-12 h-12'} rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 active:scale-90 ${
              isCompleted
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:border-emerald-500/60 hover:text-slate-200'
            }`}
            title={isCompleted ? 'إلغاء الإنجاز' : 'تسجيل الإنجاز الكامل'}
          >
            <Check className={`w-6 h-6 stroke-[3] transition-transform ${isCompleted ? 'scale-110' : 'scale-90 opacity-60'}`} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`${focusMode ? 'text-base sm:text-lg' : 'text-base'} font-bold transition-colors ${isCompleted ? 'text-slate-200 line-through opacity-85' : 'text-slate-100'}`}>
                {habit.name}
              </h3>

              {currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>{currentStreak} {currentStreak === 1 ? 'يوم' : 'أيام'}</span>
                </span>
              )}
            </div>

            {/* Numeric Cumulative Goal Progress Bar (right next to completion button) */}
            {isNumericGoal && (
              <div className="mt-2.5 max-w-md space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={isCompleted ? 'text-emerald-400' : 'text-slate-200'} dir="ltr">
                      {currentProgress} / {goalTarget}
                    </span>
                    <span className="text-slate-400 font-medium">{goalUnit}</span>
                    <span className="text-[11px] font-mono text-slate-400">({goalPercentage}%)</span>
                  </div>

                  {/* Quick +/- increment controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleStepGoal(e, -goalStep)}
                      disabled={currentProgress <= 0}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      title={`إنقاص ${goalStep} ${goalUnit}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleStepGoal(e, goalStep)}
                      className="inline-flex items-center gap-1 px-2 h-6 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                      title={`إضافة ${goalStep} ${goalUnit}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="font-mono" dir="ltr">{goalStep}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${goalPercentage}%`,
                      backgroundColor: isCompleted ? '#10b981' : habit.color,
                    }}
                  />
                </div>
              </div>
            )}

            {focusMode ? (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{TIME_NAMES[habit.timeOfDay] || habit.timeOfDay}</span>
                </span>
                {reminderTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-mono">
                    <Bell className="w-3 h-3" />
                    <span>{formatTimeArabic(reminderTime)}</span>
                  </span>
                )}
                {selectedLog?.notes && (
                  <span className="text-[11px] text-emerald-400/90 truncate max-w-[220px]">
                    • {selectedLog.notes}
                  </span>
                )}
              </div>
            ) : (
              /* Badges / Meta */
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-medium">
                  {CATEGORY_NAMES[habit.category] || habit.category}
                </span>

                {/* Schedule Type Badge */}
                {habit.scheduleType === 'specific_days' && habit.targetDays ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold text-[11px]">
                    <span>📅</span>
                    <span>{getScheduledDaysArabic(habit.targetDays)}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    الهدف: {habit.weeklyTarget} مرات/أسبوع
                  </span>
                )}

                {/* Scheduled for today indicator */}
                {habit.scheduleType === 'specific_days' && (
                  isHabitScheduledForDay(habit, selectedDate) ? (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                      مجدولة لليوم ✨
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800/70 text-slate-400 text-[11px]">
                      غير مجدولة لليوم
                    </span>
                  )
                )}

                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{TIME_NAMES[habit.timeOfDay] || habit.timeOfDay}</span>
                </span>

                {reminderTime && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-mono">
                    <Bell className="w-3 h-3 text-amber-400" />
                    <span>{formatTimeArabic(reminderTime)}</span>
                  </span>
                )}
              </div>
            )}

            {/* Saved Daily Note / Journal Chip (visible in normal view, clickable to edit) */}
            {!focusMode && selectedLog?.notes && !showNotesInput && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteText(selectedLog.notes || '');
                  setShowNotesInput(true);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 max-w-full px-3 py-1 rounded-xl bg-slate-950/70 border border-emerald-500/25 hover:border-emerald-500/50 text-xs text-slate-300 transition-colors cursor-pointer text-right"
                title="تعديل الملاحظة اليومية"
              >
                <NotebookPen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{selectedLog.notes}</span>
              </button>
            )}

            {noteSavedFeedback && !showNotesInput && (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <Check className="w-3 h-3" />
                <span>تم حفظ الملاحظة ومزامنتها</span>
              </span>
            )}
          </div>
        </div>

        {/* Left side in RTL */}
        {focusMode ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNotesInput(!showNotesInput)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                selectedLog?.notes || showNotesInput
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
              title="إضافة تدوينة أو ملاحظة قصيرة لليوم"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[11px] font-medium">
                {selectedLog?.notes ? 'تعديل الملاحظة' : 'تدوينة'}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
            
            {/* Uniform Weekly Circular Progress Ring */}
            <div
              className="flex items-center justify-center shrink-0"
              title={`نسبة الالتزام الأسبوعي: ${weeklyDone} من ${weeklyTargetCount} (${weeklyPercentage}%)`}
            >
              <CircularProgressRing
                percentage={weeklyPercentage}
                size={46}
                strokeWidth={4.5}
                color={habit.color}
              />
            </div>

            {/* Mini 7-day row */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
              {last7Days.map(day => {
                const dayCompleted = logs.some(l => l.habitId === habit.id && l.date === day.key && l.completed);
                const isCurrentSelected = day.key === selectedDateKey;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onToggleComplete(habit, day.key, !dayCompleted)}
                    title={`${getArabicDayName(day.date)} (${day.key}): ${dayCompleted ? 'مكتمل' : 'غير مكتمل'}${habit.scheduleType === 'specific_days' && isHabitScheduledForDay(habit, day.date) ? ' [يوم مجدول]' : ''}`}
                    className={`w-7 h-7 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all relative ${
                      dayCompleted
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/50'
                        : isHabitScheduledForDay(habit, day.date)
                          ? 'bg-slate-800 text-slate-300 border border-blue-500/30 hover:bg-slate-700'
                          : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60'
                    } ${isCurrentSelected ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <span>{getArabicDayName(day.date).charAt(0)}</span>
                    {habit.scheduleType === 'specific_days' && isHabitScheduledForDay(habit, day.date) && !dayCompleted && (
                      <span className="w-1 h-1 rounded-full bg-blue-400 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNotesInput(!showNotesInput)}
                className={`p-2 rounded-xl text-xs transition-colors ${
                  selectedLog?.notes || showNotesInput
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="إضافة ملاحظة لليوم في Google Sheets"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                onClick={() => onEditHabit(habit)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="تعديل العادة"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteHabit(habit)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="حذف العادة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Optional Daily Notes / Journal Drawer */}
      {showNotesInput && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 animate-in fade-in space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <NotebookPen className="w-3.5 h-3.5 text-emerald-400" />
              <span>تدوينة أو ملاحظة يومية ({selectedDateKey})</span>
              <span className="text-[11px] font-normal text-slate-400">(اختياري)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              تُحفظ في عمود «ملاحظات» بـ Google Sheets
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNotes();
                } else if (e.key === 'Escape') {
                  setNoteText(selectedLog?.notes || '');
                  setShowNotesInput(false);
                }
              }}
              maxLength={280}
              autoFocus
              placeholder="اكتب تدوينة قصيرة أو ملاحظة حول إنجاز اليوم..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-1.5 justify-end">
              {selectedLog?.notes && (
                <button
                  type="button"
                  onClick={handleClearNotes}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                  title="حذف الملاحظة"
                >
                  حذف
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setNoteText(selectedLog?.notes || '');
                  setShowNotesInput(false);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {selectedLog?.notes ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
