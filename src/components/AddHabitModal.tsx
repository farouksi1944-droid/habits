import React, { useState, useEffect } from 'react';
import { X, Sparkles, CalendarDays, Check, Bell, Target } from 'lucide-react';
import { Habit, HabitCategory, ScheduleType, GoalType } from '../types';
import { DAYS_OF_WEEK } from '../lib/dateUtils';
import { getDefaultTimeForPeriod, getEffectiveReminderTime } from '../lib/notifications';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  editingHabit?: Habit | null;
}

const CATEGORIES: { id: HabitCategory; label: string; icon: string }[] = [
  { id: 'health', label: 'صحة ولياقة', icon: '🏃' },
  { id: 'spiritual', label: 'عبادة وروحانيات', icon: '🕌' },
  { id: 'learning', label: 'تعلم وقراءة', icon: '📚' },
  { id: 'productivity', label: 'إنتاجية وعمل', icon: '💼' },
  { id: 'wellness', label: 'نمط حياة وعافية', icon: '🌿' },
  { id: 'finance', label: 'مالية وتوفير', icon: '💰' },
];

const COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#14b8a6', // Teal
];

export const AddHabitModal: React.FC<AddHabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingHabit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [color, setColor] = useState('#10b981');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [targetDays, setTargetDays] = useState<number[]>([0, 2]); // Default e.g. Sunday & Tuesday
  const [weeklyTarget, setWeeklyTarget] = useState(7);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>('anytime');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [goalType, setGoalType] = useState<GoalType>('boolean');
  const [goalTarget, setGoalTarget] = useState('2');
  const [goalUnit, setGoalUnit] = useState('لتر');
  const [goalStep, setGoalStep] = useState('0.25');

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setCategory(editingHabit.category);
      setColor(editingHabit.color);
      setScheduleType(editingHabit.scheduleType || 'daily');
      setTargetDays(editingHabit.targetDays || [0, 2]);
      setWeeklyTarget(editingHabit.weeklyTarget || 7);
      setTimeOfDay(editingHabit.timeOfDay || 'anytime');
      const effectiveTime = getEffectiveReminderTime(editingHabit);
      setReminderEnabled(Boolean(effectiveTime));
      setReminderTime(effectiveTime || getDefaultTimeForPeriod(editingHabit.timeOfDay || 'anytime'));
      setGoalType(editingHabit.goalType === 'numeric' ? 'numeric' : 'boolean');
      setGoalTarget(String(editingHabit.goalTarget ?? 2));
      setGoalUnit(editingHabit.goalUnit || 'لتر');
      setGoalStep(String(editingHabit.goalStep ?? 0.25));
    } else {
      setName('');
      setCategory('health');
      setColor('#10b981');
      setScheduleType('daily');
      setTargetDays([0, 2]); // Sunday and Tuesday
      setWeeklyTarget(7);
      setTimeOfDay('anytime');
      setReminderEnabled(false);
      setReminderTime('09:00');
      setGoalType('boolean');
      setGoalTarget('2');
      setGoalUnit('لتر');
      setGoalStep('0.25');
    }
  }, [editingHabit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayIndex: number) => {
    let next: number[];
    if (targetDays.includes(dayIndex)) {
      if (targetDays.length === 1) return; // Keep at least one day
      next = targetDays.filter(d => d !== dayIndex);
    } else {
      next = [...targetDays, dayIndex].sort();
    }
    setTargetDays(next);
    setWeeklyTarget(next.length);
  };

  const applyPresetDays = (preset: number[]) => {
    setTargetDays(preset);
    setWeeklyTarget(preset.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedTarget = Math.max(0.1, Number(goalTarget) || 1);
    const parsedStep = Math.max(0.05, Number(goalStep) || 1);

    onSave({
      name: name.trim(),
      category,
      color,
      scheduleType,
      targetDays: scheduleType === 'specific_days' ? targetDays : undefined,
      weeklyTarget: scheduleType === 'specific_days' ? targetDays.length : Number(weeklyTarget),
      timeOfDay,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      goalType,
      goalTarget: goalType === 'numeric' ? parsedTarget : undefined,
      goalUnit: goalType === 'numeric' ? (goalUnit.trim() || 'مرة') : undefined,
      goalStep: goalType === 'numeric' ? parsedStep : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">
              {editingHabit ? 'تعديل العادة' : 'إضافة عادة جديدة'}
            </h3>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              اسم العادة <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مراجعة الرياضيات، قراءة كتاب، تمرين رياضي..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              التصنيف
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    category === cat.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span>{cat.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Type (Boolean vs Cumulative Numeric Goal) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>نوع الهدف اليومي</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGoalType('boolean')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  goalType === 'boolean'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                إنجاز عادي (تم / لم يتم)
              </button>

              <button
                type="button"
                onClick={() => setGoalType('numeric')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  goalType === 'numeric'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                هدف رقمي تراكمي (2 لتر...)
              </button>
            </div>

            {goalType === 'numeric' && (
              <div className="space-y-2.5 pt-1 animate-in fade-in">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      الهدف المطلوب
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      الوحدة
                    </label>
                    <input
                      type="text"
                      required
                      value={goalUnit}
                      onChange={(e) => setGoalUnit(e.target.value)}
                      placeholder="لتر"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      مقدار الزيادة (+)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.05"
                      required
                      value={goalStep}
                      onChange={(e) => setGoalStep(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Quick numeric presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-slate-400">أمثلة سريعة:</span>
                  {[
                    { label: '2 لتر ماء (+0.25)', target: '2', unit: 'لتر', step: '0.25' },
                    { label: '20 دقيقة (+5)', target: '20', unit: 'دقيقة', step: '5' },
                    { label: '10 صفحات (+2)', target: '10', unit: 'صفحة', step: '2' },
                    { label: '8 أكواب (+1)', target: '8', unit: 'كوب', step: '1' },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setGoalTarget(preset.target);
                        setGoalUnit(preset.unit);
                        setGoalStep(preset.step);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Mode Selector (Daily vs Specific Days) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              نظام الجدولة والتكرار
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('daily')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  scheduleType === 'daily'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                تكرار يومي / مرن
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleType('specific_days');
                  setWeeklyTarget(targetDays.length);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  scheduleType === 'specific_days'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>أيام محددة بالأسبوع</span>
              </button>
            </div>

            {/* Specific Days Picker */}
            {scheduleType === 'specific_days' ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-emerald-400 font-bold">
                    {targetDays.length} أيام محددة أسبوعياً
                  </span>
                  <span>حدد الأيام المخصصة لهذه العادة:</span>
                </div>

                {/* Day selector buttons */}
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = targetDays.includes(day.index);
                    return (
                      <button
                        key={day.index}
                        type="button"
                        onClick={() => toggleDay(day.index)}
                        className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50 scale-105'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span className="text-[11px]">{day.short}</span>
                        {isSelected && <Check className="w-3 h-3 mt-0.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                  <span className="text-slate-400">نماذج سريعة:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetDays([0, 2])}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  >
                    الأحد والثلاثاء (رياضيات)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays([0, 1, 2, 3, 4])}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  >
                    أيام العمل (أحد - خميس)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays([5, 6])}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  >
                    الجمعة والسبت
                  </button>
                </div>
              </div>
            ) : (
              /* Daily Flexible Target */
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  الهدف الأسبوعي
                </label>
                <select
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value={7}>يومياً (7 أيام بالاسبوع)</option>
                  <option value={6}>6 أيام بالاسبوع</option>
                  <option value={5}>5 أيام بالاسبوع</option>
                  <option value={4}>4 أيام بالاسبوع</option>
                  <option value={3}>3 أيام بالاسبوع</option>
                  <option value={2}>يومان في الأسبوع</option>
                  <option value={1}>مرة واحدة أسبوعياً</option>
                </select>
              </div>
            )}
          </div>

          {/* Time of Day & Reminder */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الوقت المفضل في اليوم
              </label>
              <select
                value={timeOfDay}
                onChange={(e) => {
                  const nextPeriod = e.target.value as Habit['timeOfDay'];
                  setTimeOfDay(nextPeriod);
                  if (nextPeriod !== 'anytime') {
                    setReminderTime(getDefaultTimeForPeriod(nextPeriod));
                    if (!editingHabit) {
                      setReminderEnabled(true);
                    }
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="anytime">أي وقت خلال اليوم</option>
                <option value="morning">الصباح الباكر ☀️</option>
                <option value="afternoon">فترة الظهيرة 🌤️</option>
                <option value="evening">المساء / قبل النوم 🌙</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => setReminderEnabled(prev => !prev)}
                className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                <span className={reminderEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                  تفعيل إشعار التذكير
                </span>
                <span
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    reminderEnabled ? 'bg-emerald-600 justify-start' : 'bg-slate-800 justify-end'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </span>
                <Bell className={`w-3.5 h-3.5 ${reminderEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              </button>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              لون التمييز
            </label>
            <div className="flex items-center gap-2.5">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110 opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              {editingHabit ? 'حفظ التعديل' : 'إضافة العادة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
