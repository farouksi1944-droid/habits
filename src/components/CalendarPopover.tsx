import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Habit, HabitLog } from '../types';
import { toDateKey, DAYS_OF_WEEK, isHabitScheduledForDay } from '../lib/dateUtils';

interface CalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  habits: Habit[];
  logs: HabitLog[];
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  habits,
  logs,
}) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.parentElement?.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeHabits = habits.filter(h => !h.archived);
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewYear, viewMonth, day));
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    onSelectDate(now);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-40 w-80 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/70 p-4 text-right animate-in fade-in"
      role="dialog"
      aria-label="التقويم"
    >
      {/* Month Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          title="الشهر السابق"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
          <CalendarIcon className="w-4 h-4 text-emerald-400" />
          <span>{ARABIC_MONTHS[viewMonth]} {viewYear}</span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          title="الشهر التالي"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
        {DAYS_OF_WEEK.map(day => (
          <div key={day.index} className="text-[10px] font-bold text-slate-400 py-1">
            {day.short}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateObj, idx) => {
          if (!dateObj) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }

          const key = toDateKey(dateObj);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;

          // Check completions on this date
          const scheduledHabits = activeHabits.filter(h => isHabitScheduledForDay(h, dateObj));
          const completedCount = activeHabits.filter(h =>
            logs.some(l => l.habitId === h.id && l.date === key && l.completed)
          ).length;
          const allScheduledDone = scheduledHabits.length > 0 && completedCount >= scheduledHabits.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelectDate(dateObj);
                onClose();
              }}
              className={`h-9 rounded-xl flex flex-col items-center justify-center relative text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-950/50 ring-2 ring-emerald-400/50'
                  : isToday
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-emerald-500/25'
                    : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{dateObj.getDate()}</span>
              {completedCount > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                    isSelected
                      ? 'bg-white'
                      : allScheduledDone
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Legend & Jump to Today */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[11px]">
        <button
          type="button"
          onClick={handleJumpToday}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-500/25 transition-colors cursor-pointer"
        >
          الذهاب لليوم
        </button>

        <div className="flex items-center gap-2.5 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            مكتمل
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            جزئي
          </span>
        </div>
      </div>
    </div>
  );
};
