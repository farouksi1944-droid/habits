export type HabitCategory = 
  | 'health' // صحة ولياقة
  | 'spiritual' // عبادة وروحانيات
  | 'learning' // تعلم وقراءة
  | 'productivity' // إنتاجية وعمل
  | 'wellness' // نمط حياة وعافية
  | 'finance'; // مالية وتوفير

export type ScheduleType = 'daily' | 'specific_days';
export type GoalType = 'boolean' | 'numeric';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  color: string;
  icon: string;
  weeklyTarget: number; // e.g. 7 for every day, or count of specific days
  scheduleType?: ScheduleType; // 'daily' | 'specific_days'
  targetDays?: number[]; // 0=الأحد, 1=الإثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس, 5=الجمعة, 6=السبت
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  reminderTime?: string; // "HH:MM" 24-hour format, e.g. "08:00"
  reminderEnabled?: boolean;
  goalType?: GoalType; // 'boolean' (check) | 'numeric' (cumulative numeric target)
  goalTarget?: number; // e.g. 2 (liters), 20 (minutes), 10 (pages)
  goalUnit?: string; // e.g. 'لتر', 'دقيقة', 'صفحة'
  goalStep?: number; // increment step per click, e.g. 0.25, 5, 1
  createdAt: string; // ISO string
  archived?: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export interface HabitLog {
  id?: string;
  habitId: string;
  habitName: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  progressValue?: number;
  notes?: string;
  updatedAt?: string;
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  lastSyncedAt?: string;
}

export interface ConfirmDialogOptions {
  isOpen: boolean;
  title: string;
  message: string;
  itemDescription?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}
