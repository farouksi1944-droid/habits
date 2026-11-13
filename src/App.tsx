import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  ListChecks, 
  LayoutGrid, 
  BarChart3, 
  Sparkles, 
  FileSpreadsheet,
  AlertCircle,
  Plus,
  WifiOff,
  Focus,
  Minimize2,
  CheckCircle2,
  Trophy,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { 
  Habit, 
  HabitLog, 
  HabitCategory, 
  SpreadsheetInfo, 
  ConfirmDialogOptions 
} from './types';

import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logout 
} from './lib/auth';

import { 
  getLocalHabits, 
  saveLocalHabits, 
  getLocalLogs, 
  saveLocalLogs, 
  getSavedSpreadsheetId, 
  saveSpreadsheetId,
  clearSpreadsheetId,
  createHabitSpreadsheet, 
  syncFromSpreadsheet, 
  appendHabitToSpreadsheet, 
  updateAllHabitsInSpreadsheet, 
  recordLogToSpreadsheet,
  getPendingSyncCount,
  queueHabitsSync,
  queueLogSync,
  flushPendingSync,
  extractSpreadsheetId,
  findExistingHabitSpreadsheet,
  SheetsApiError,
  INITIAL_DEFAULT_HABITS
} from './lib/sheetsService';

import { 
  toDateKey, 
  getArabicDayName, 
  getArabicDateDisplay,
  isHabitScheduledForDay
} from './lib/dateUtils';
import { calculateGamification } from './lib/gamification';

import { useOnlineStatus } from './hooks/usePWAInstall';
import { useHabitReminders } from './hooks/useHabitReminders';
import { useTheme } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { HabitCard } from './components/HabitCard';
import { WeeklyGridView } from './components/WeeklyGridView';
import { AnalyticsView } from './components/AnalyticsView';
import { AddHabitModal } from './components/AddHabitModal';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { GoogleSignInCard } from './components/GoogleSignInCard';
import { CalendarPopover } from './components/CalendarPopover';
import { ReminderToastStack } from './components/ReminderToastStack';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Habits and Logs State
  const [habits, setHabits] = useState<Habit[]>(() => getLocalHabits());
  const [logs, setLogs] = useState<HabitLog[]>(() => getLocalLogs());

  // Google Sheets Info
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(() => {
    const savedId = getSavedSpreadsheetId();
    if (savedId) {
      return {
        id: savedId,
        title: 'متتبع العادات (Google Sheets)',
        url: `https://docs.google.com/spreadsheets/d/${savedId}/edit`,
      };
    }
    return null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<{ message: string; kind: 'auth' | 'missing_sheet' | 'general' } | null>(null);
  const isSyncRunningRef = useRef(false);
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingSyncCount());
  const [dismissedAuthBanner, setDismissedAuthBanner] = useState<boolean>(false);

  // Active Date Selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Views & Filters
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'analytics'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');
  const [onlyScheduledForDay, setOnlyScheduledForDay] = useState(false);

  // Focus Mode State (persisted locally)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('habitflow_focus_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [focusShowAllHabits, setFocusShowAllHabits] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);
  const [levelUpToast, setLevelUpToast] = useState<{ level: number; rankTitle: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('habitflow_focus_mode', String(isFocusMode));
    } catch {
      // ignore storage errors
    }
  }, [isFocusMode]);

  // Allow exiting Focus Mode with Escape key when no modal is open
  useEffect(() => {
    if (!isFocusMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAddModalOpen && !isSettingsModalOpen && !confirmOptions) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, isAddModalOpen, isSettingsModalOpen, confirmOptions]);

  // Check auth state on initial mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsAuthLoading(false);
      },
      () => {
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const buildSheetUrl = (id: string, email?: string | null) =>
    `https://docs.google.com/spreadsheets/d/${id}/edit${email ? `?authuser=${encodeURIComponent(email)}` : ''}`;

  // When user and token are ready, ensure connected spreadsheet is synced
  useEffect(() => {
    if (user && token && isOnline) {
      handleInitialSheetsSync(token, user.email);
    }
  }, [user, token, isOnline]);

  const handleInitialSheetsSync = async (accessToken: string, email?: string | null) => {
    if (!navigator.onLine || isSyncRunningRef.current) return;
    isSyncRunningRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage('جارِ فحص جدول البيانات في Google Drive...');
    try {
      let targetId = getSavedSpreadsheetId();
      let targetTitle = 'متتبع العادات (Google Sheets)';

      if (!targetId) {
        setSyncStatusMessage('البحث عن جدول عاداتك في Google Drive...');
        const existingDriveSheet = await findExistingHabitSpreadsheet(accessToken);
        if (existingDriveSheet) {
          targetId = existingDriveSheet.id;
          targetTitle = existingDriveSheet.name;
          saveSpreadsheetId(targetId);
        }
      }

      if (targetId) {
        try {
          // Flush any offline edits first so they aren't overwritten
          if (getPendingSyncCount() > 0) {
            setSyncStatusMessage('جارِ مزامنة التغييرات المحفوظة محلياً...');
            await flushPendingSync(accessToken, targetId, getLocalHabits());
            setPendingSyncCount(getPendingSyncCount());
          }
          // Sync existing sheet
          setSyncStatusMessage('جارِ مزامنة العادات من Google Sheets...');
          const data = await syncFromSpreadsheet(accessToken, targetId);
          setHabits(data.habits);
          setLogs(data.logs);
          setSpreadsheetInfo({
            id: targetId,
            title: targetTitle,
            url: buildSheetUrl(targetId, email ?? user?.email),
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (err: any) {
          if (err instanceof SheetsApiError && err.status === 404) {
            // The saved spreadsheet was deleted or doesn't exist — recreate cleanly with local data
            clearSpreadsheetId();
            setSpreadsheetInfo(null);
            setSyncStatusMessage('لم يُعثر على الجدول السابق في Drive — جارِ إنشاء جدول جديد...');
            const newSheet = await createHabitSpreadsheet(accessToken);
            setSpreadsheetInfo({
              ...newSheet,
              url: buildSheetUrl(newSheet.id, email ?? user?.email),
            });
            setSyncError({
              kind: 'general',
              message: 'لم يتم العثور على ملف Google Sheets السابق (قد يكون حُذف من Drive)، لذا تم إنشاء جدول جديد وحفظ بياناتك الحالية فيه.',
            });
          } else {
            throw err;
          }
        }
      } else {
        // Auto-create spreadsheet for user if none exists in localStorage or Drive
        setSyncStatusMessage('إنشاء جدول جديد في Google Drive...');
        const newSheet = await createHabitSpreadsheet(accessToken);
        setSpreadsheetInfo({
          ...newSheet,
          url: buildSheetUrl(newSheet.id, email ?? user?.email),
        });
      }
    } catch (err: any) {
      console.error('Initial sync error:', err);
      if (err instanceof SheetsApiError && err.status === 401) {
        setSyncError({
          kind: 'auth',
          message: 'انتهت صلاحية جلسة Google، يرجى إعادة ربط الحساب للمزامنة.',
        });
      } else if (err instanceof SheetsApiError && err.status === 403) {
        setSyncError({
          kind: 'missing_sheet',
          message: 'لا يملك الحساب الحالي صلاحية الوصول إلى جدول البيانات المرتبط. يمكنك إنشاء جدول جديد في حسابك.',
        });
      } else {
        setSyncError({
          kind: 'general',
          message: err?.message || 'تعذر الاتصال بـ Google Sheets حالياً.',
        });
      }
    } finally {
      isSyncRunningRef.current = false;
      setIsSyncing(false);
      setSyncStatusMessage(null);
    }
  };

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await handleInitialSheetsSync(res.accessToken, res.user.email);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('حدث خطأ أثناء تسجيل الدخول أو إذن الوصول إلى Google Sheets.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSyncError(null);
  };

  // Manual Full Sync with Sheets
  const handleManualSync = async () => {
    if (!isOnline) return;
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setSyncError({
        kind: 'auth',
        message: 'يرجى إعادة ربط حساب Google للمزامنة.',
      });
      return;
    }
    if (!spreadsheetInfo?.id) {
      await handleInitialSheetsSync(currentToken, user?.email);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage('جارِ المزامنة...');
    try {
      if (getPendingSyncCount() > 0) {
        await flushPendingSync(currentToken, spreadsheetInfo.id, habits);
        setPendingSyncCount(getPendingSyncCount());
      }
      const data = await syncFromSpreadsheet(currentToken, spreadsheetInfo.id);
      setHabits(data.habits);
      setLogs(data.logs);
      setSpreadsheetInfo(prev =>
        prev
          ? {
              ...prev,
              url: buildSheetUrl(prev.id, user?.email),
              lastSyncedAt: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      if (err instanceof SheetsApiError && err.status === 404) {
        clearSpreadsheetId();
        setSpreadsheetInfo(null);
        setSyncError({
          kind: 'missing_sheet',
          message: 'ملف Google Sheets المرتبط غير موجود أو تم حذفه من Drive. اضغط على «إنشاء جدول جديد الآن» لاستعادة المزامنة.',
        });
      } else if (err instanceof SheetsApiError && err.status === 401) {
        setSyncError({
          kind: 'auth',
          message: 'انتهت صلاحية جلسة Google، يرجى إعادة ربط Google.',
        });
      } else {
        setSyncError({
          kind: 'general',
          message: err?.message || 'فشلت المزامنة مع Google Sheets.',
        });
      }
    } finally {
      setIsSyncing(false);
      setSyncStatusMessage(null);
    }
  };

  // Toggle habit completion or numeric progress on a specific day
  const handleToggleComplete = async (
    habit: Habit, 
    dateKey: string, 
    completed: boolean, 
    notes?: string,
    progressValue?: number
  ) => {
    const resolvedProgress =
      progressValue !== undefined
        ? progressValue
        : habit.goalType === 'numeric'
          ? (completed ? (habit.goalTarget || 1) : 0)
          : undefined;

    // 1. Instant local state update & persistent localStorage save
    const existingIndex = logs.findIndex(l => l.habitId === habit.id && l.date === dateKey);
    const resolvedNotes =
      notes !== undefined
        ? notes
        : existingIndex >= 0
          ? (logs[existingIndex].notes || '')
          : '';
    let updatedLogs = [...logs];

    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = {
        ...updatedLogs[existingIndex],
        completed,
        progressValue: resolvedProgress,
        notes: resolvedNotes,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedLogs.push({
        habitId: habit.id,
        habitName: habit.name,
        date: dateKey,
        completed,
        progressValue: resolvedProgress,
        notes: resolvedNotes,
        updatedAt: new Date().toISOString(),
      });
    }

    const prevGamification = calculateGamification(habits, logs);

    setLogs(updatedLogs);
    saveLocalLogs(updatedLogs);

    const nextGamification = calculateGamification(habits, updatedLogs);
    if (nextGamification.level > prevGamification.level) {
      setLevelUpToast({
        level: nextGamification.level,
        rankTitle: nextGamification.rank.title,
      });
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.7 },
        });
      } catch {
        // Ignore if canvas is unavailable
      }
      setTimeout(() => {
        setLevelUpToast(prev =>
          prev?.level === nextGamification.level ? null : prev
        );
      }, 6000);
    }

    // 2. Sync to Google Sheets if online & connected, otherwise queue for later sync
    const currentToken = token || (await getAccessToken());
    if (isOnline && currentToken && spreadsheetInfo?.id) {
      setIsSyncing(true);
      try {
        await recordLogToSpreadsheet(
          currentToken,
          spreadsheetInfo.id,
          habit.id,
          habit.name,
          dateKey,
          completed,
          resolvedNotes,
          resolvedProgress
        );
      } catch (e) {
        console.error('Failed to sync log to sheet, queuing offline:', e);
        queueLogSync({
          habitId: habit.id,
          habitName: habit.name,
          date: dateKey,
          completed,
          progressValue: resolvedProgress,
          notes: resolvedNotes,
        });
        setPendingSyncCount(getPendingSyncCount());
      } finally {
        setIsSyncing(false);
      }
    } else {
      queueLogSync({
        habitId: habit.id,
        habitName: habit.name,
        date: dateKey,
        completed,
        progressValue: resolvedProgress,
        notes: resolvedNotes,
      });
      setPendingSyncCount(getPendingSyncCount());
    }
  };

  // Add or Edit Habit
  const handleSaveHabit = async (habitData: Partial<Habit>) => {
    const currentToken = token || (await getAccessToken());

    if (editingHabit) {
      // Update existing habit
      const updated = habits.map(h => 
        h.id === editingHabit.id ? { ...h, ...habitData } : h
      );
      setHabits(updated);
      saveLocalHabits(updated);
      setEditingHabit(null);

      if (isOnline && currentToken && spreadsheetInfo?.id) {
        setIsSyncing(true);
        try {
          await updateAllHabitsInSpreadsheet(currentToken, spreadsheetInfo.id, updated);
        } catch (e) {
          console.error('Failed to update habits in Google Sheets, queuing offline:', e);
          queueHabitsSync();
          setPendingSyncCount(getPendingSyncCount());
        } finally {
          setIsSyncing(false);
        }
      } else {
        queueHabitsSync();
        setPendingSyncCount(getPendingSyncCount());
      }
    } else {
      // Create new habit
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name: habitData.name || 'عادة جديدة',
        category: habitData.category || 'health',
        color: habitData.color || '#10b981',
        icon: 'check-circle',
        weeklyTarget: habitData.weeklyTarget || 7,
        scheduleType: habitData.scheduleType || 'daily',
        targetDays: habitData.targetDays,
        timeOfDay: habitData.timeOfDay || 'anytime',
        reminderEnabled: habitData.reminderEnabled,
        reminderTime: habitData.reminderTime,
        goalType: habitData.goalType || 'boolean',
        goalTarget: habitData.goalTarget,
        goalUnit: habitData.goalUnit,
        goalStep: habitData.goalStep,
        createdAt: new Date().toISOString(),
        archived: false,
      };

      const updated = [...habits, newHabit];
      setHabits(updated);
      saveLocalHabits(updated);

      if (isOnline && currentToken && spreadsheetInfo?.id) {
        setIsSyncing(true);
        try {
          await appendHabitToSpreadsheet(currentToken, spreadsheetInfo.id, newHabit);
        } catch (e) {
          console.error('Failed to append habit to Google Sheets, queuing offline:', e);
          queueHabitsSync();
          setPendingSyncCount(getPendingSyncCount());
        } finally {
          setIsSyncing(false);
        }
      } else {
        queueHabitsSync();
        setPendingSyncCount(getPendingSyncCount());
      }
    }
  };

  // Delete Habit with MANDATORY explicit user confirmation dialog
  const handleDeleteHabit = (habit: Habit) => {
    setConfirmOptions({
      isOpen: true,
      title: 'تأكيد حذف العادة',
      message: `هل أنت متأكد من رغبتك في حذف عادة "${habit.name}"؟`,
      itemDescription: `سيتم إزالة العادة "${habit.name}" من جهازك وتحديث جدول Google Sheets المتصل (${spreadsheetInfo?.title || 'جدول العادات'}).`,
      confirmText: 'نعم، احذف العادة',
      cancelText: 'إلغاء التراجع',
      isDestructive: true,
      onConfirm: async () => {
        const updated = habits.filter(h => h.id !== habit.id);
        setHabits(updated);
        saveLocalHabits(updated);

        const currentToken = token || (await getAccessToken());
        if (isOnline && currentToken && spreadsheetInfo?.id) {
          setIsSyncing(true);
          try {
            await updateAllHabitsInSpreadsheet(currentToken, spreadsheetInfo.id, updated);
          } catch (e) {
            console.error('Failed to sync habit deletion to Google Sheets, queuing offline:', e);
            queueHabitsSync();
            setPendingSyncCount(getPendingSyncCount());
          } finally {
            setIsSyncing(false);
          }
        } else {
          queueHabitsSync();
          setPendingSyncCount(getPendingSyncCount());
        }
      },
    });
  };

  const handleImportBackup = (importedHabits: Habit[], importedLogs: HabitLog[]) => {
    setHabits(importedHabits);
    setLogs(importedLogs);
    saveLocalHabits(importedHabits);
    saveLocalLogs(importedLogs);
    queueHabitsSync();
    importedLogs.forEach(log => {
      queueLogSync({
        habitId: log.habitId,
        habitName: log.habitName,
        date: log.date,
        completed: log.completed,
        progressValue: log.progressValue,
        notes: log.notes,
      });
    });
    setPendingSyncCount(getPendingSyncCount());
  };

  // Create brand new spreadsheet (with user confirmation)
  const handleCreateNewSheet = async () => {
    setConfirmOptions({
      isOpen: true,
      title: 'إنشاء جدول Google Sheets جديد',
      message: 'سيتم إنشاء ملف جدول بيانات جديد تماماً في حسابك على Google Drive ونقل عاداتك الحالية إليه.',
      confirmText: 'إنشاء الجدول الآن',
      cancelText: 'إلغاء',
      isDestructive: false,
      onConfirm: async () => {
        let currentToken = token || (await getAccessToken());
        let activeEmail = user?.email;
        if (!currentToken) {
          const res = await googleSignIn();
          if (!res) return;
          currentToken = res.accessToken;
          activeEmail = res.user.email;
          setUser(res.user);
          setToken(res.accessToken);
        }

        setIsSyncing(true);
        setSyncError(null);
        try {
          const info = await createHabitSpreadsheet(currentToken);
          setSpreadsheetInfo({
            ...info,
            url: buildSheetUrl(info.id, activeEmail),
          });
          setIsSettingsModalOpen(false);
        } catch (e: any) {
          console.error('Failed to create new spreadsheet:', e);
          setSyncError({
            kind: 'general',
            message: e?.message || 'تعذر إنشاء جدول جديد في Google Drive.',
          });
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Connect custom spreadsheet ID or full URL (validates before saving)
  const handleConnectCustomId = async (rawInput: string) => {
    const cleanId = extractSpreadsheetId(rawInput);
    if (!cleanId) {
      throw new Error('الرابط أو المعرف غير صالح. يرجى لصق رابط Google Sheets كامل أو معرف الجدول الصحيح.');
    }

    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      throw new Error('يرجى ربط حساب Google أولاً ثم إعادة المحاولة.');
    }

    setIsSyncing(true);
    try {
      const data = await syncFromSpreadsheet(currentToken, cleanId);
      saveSpreadsheetId(cleanId);
      setHabits(data.habits);
      setLogs(data.logs);
      setSyncError(null);
      setSpreadsheetInfo({
        id: cleanId,
        title: 'جدول متصل مخصص',
        url: buildSheetUrl(cleanId, user?.email),
        lastSyncedAt: new Date().toISOString(),
      });
      setIsSettingsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to connect custom spreadsheet:', err);
      if (err instanceof SheetsApiError && err.status === 404) {
        throw new Error('لم يتم العثور على هذا الجدول في Google Drive (تأكد من صحة الرابط أو أنه غير محذوف).');
      }
      if (err instanceof SheetsApiError && err.status === 403) {
        throw new Error('لا يملك حسابك صلاحية الوصول إلى هذا الجدول.');
      }
      if (err instanceof SheetsApiError && err.status === 401) {
        throw new Error('انتهت صلاحية جلسة Google، يرجى إعادة تسجيل الدخول.');
      }
      throw new Error(err?.message || 'تعذر الاتصال بالجدول المطلوب.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSheet = () => {
    clearSpreadsheetId();
    setSpreadsheetInfo(null);
    setSyncError(null);
  };

  // Date Navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleSelectToday = () => {
    setSelectedDate(new Date());
  };

  // Filtered active habits
  const activeHabits = habits.filter(h => !h.archived);
  const scheduledCountForSelectedDate = activeHabits.filter(h => isHabitScheduledForDay(h, selectedDate)).length;

  let filteredHabits = selectedCategory === 'all'
    ? activeHabits
    : activeHabits.filter(h => h.category === selectedCategory);

  if (activeTab === 'daily' && onlyScheduledForDay) {
    filteredHabits = filteredHabits.filter(h => isHabitScheduledForDay(h, selectedDate));
  }

  const isToday = toDateKey(selectedDate) === toDateKey(new Date());
  const selectedDateKey = toDateKey(selectedDate);

  // Habit Reminders & Notifications Hook
  const {
    settings: reminderSettings,
    updateSettings: updateReminderSettings,
    browserPermission: browserNotificationPermission,
    enableBrowserNotifications,
    activeReminders,
    todaySchedule,
    dueCount: dueReminderCount,
    dismissReminder,
    snoozeReminder,
    completeFromReminder,
    triggerTestNotification,
  } = useHabitReminders({
    habits,
    logs,
    onCompleteHabit: (habit, dateKey) => {
      handleToggleComplete(habit, dateKey, true);
    },
  });

  // Daily habits computation for Focus Mode
  const scheduledHabitsForDay = activeHabits.filter(h => isHabitScheduledForDay(h, selectedDate));
  const unscheduledCountForDay = activeHabits.length - scheduledHabitsForDay.length;
  const focusHabits = focusShowAllHabits || scheduledHabitsForDay.length === 0
    ? activeHabits
    : scheduledHabitsForDay;
  const focusCompletedCount = focusHabits.filter(h =>
    logs.some(l => l.habitId === h.id && l.date === selectedDateKey && l.completed)
  ).length;
  const focusProgressPercent = focusHabits.length > 0
    ? Math.round((focusCompletedCount / focusHabits.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Tajawal',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar (Hidden in Focus Mode for distraction-free view) */}
      {!isFocusMode ? (
        <Navbar
          user={user}
          spreadsheetInfo={spreadsheetInfo}
          isSyncing={isSyncing}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(true)}
          reminderSettings={reminderSettings}
          onUpdateReminderSettings={updateReminderSettings}
          browserNotificationPermission={browserNotificationPermission}
          onEnableBrowserNotifications={enableBrowserNotifications}
          todaySchedule={todaySchedule}
          dueReminderCount={dueReminderCount}
          onCompleteHabitFromReminder={(habit, dateKey) => handleToggleComplete(habit, dateKey, true)}
          onTriggerTestReminder={triggerTestNotification}
          onOpenAddModal={() => {
            setEditingHabit(null);
            setIsAddModalOpen(true);
          }}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onManualSync={handleManualSync}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
      ) : (
        <header className="sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="العودة إلى الواجهة الكاملة (Esc)"
            >
              <Minimize2 className="w-4 h-4 text-indigo-400" />
              <span>الخروج من نمط التركيز</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                <Focus className="w-3.5 h-3.5" />
                <span>نمط التركيز</span>
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      {isFocusMode ? (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
          {/* Calm Daily Focus Header & Progress */}
          <div className="bg-slate-900/60 border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
                  <span>{isToday ? 'عادات اليوم' : `عادات ${getArabicDayName(selectedDate)}`}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {getArabicDateDisplay(selectedDate)}
                </p>
              </div>

              {/* Minimal Date Navigation in Focus Mode */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                  title="اليوم السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors"
                  >
                    اليوم
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                  title="اليوم التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clean Daily Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  تم إنجاز <span className="text-emerald-400 font-bold">{focusCompletedCount}</span> من أصل <span className="font-bold">{focusHabits.length}</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {focusProgressPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${focusProgressPercent}%` }}
                />
              </div>
            </div>

            {focusHabits.length > 0 && focusCompletedCount === focusHabits.length && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>أحسنت! أتممت جميع عاداتك اليومية بنجاح.</span>
              </div>
            )}
          </div>

          {/* Focused Daily Habits List */}
          <div className="space-y-3">
            {focusHabits.length > 0 ? (
              focusHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  logs={logs}
                  selectedDate={selectedDate}
                  focusMode={true}
                  onToggleComplete={handleToggleComplete}
                  onEditHabit={(h) => {
                    setEditingHabit(h);
                    setIsAddModalOpen(true);
                  }}
                  onDeleteHabit={handleDeleteHabit}
                />
              ))
            ) : (
              <div className="p-10 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <p className="text-sm font-bold text-slate-200">لا توجد عادات مجدولة لهذا اليوم</p>
                <p className="text-xs text-slate-400">يمكنك إضافة عادة جديدة أو الخروج من نمط التركيز لاستعراض باقي الأيام.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingHabit(null);
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عادة</span>
                </button>
              </div>
            )}
          </div>

          {/* Discreet Toggle for Unscheduled Habits if any exist */}
          {unscheduledCountForDay > 0 && scheduledHabitsForDay.length > 0 && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setFocusShowAllHabits(prev => !prev)}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
              >
                {focusShowAllHabits
                  ? 'التركيز على عادات اليوم المجدولة فقط'
                  : `إظهار ${unscheduledCountForDay} عادات غير مجدولة لليوم`}
              </button>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* If user is not signed in with Google (and online + not dismissed), show the Google Sheets integration banner */}
          {!user && isOnline && !dismissedAuthBanner && (
            <GoogleSignInCard
              onSignIn={handleSignIn}
              isLoading={isAuthLoading}
              onContinueOffline={() => setDismissedAuthBanner(true)}
              error={authError}
            />
          )}

          {/* Sync message if active */}
          {syncStatusMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-medium flex items-center justify-between">
              <span className="font-mono">{syncStatusMessage}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}

          {/* Sync error / recovery alert */}
          {syncError && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/35 rounded-2xl text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{syncError.message}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {syncError.kind === 'auth' && (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    إعادة ربط Google
                  </button>
                )}
                {syncError.kind === 'missing_sheet' && (
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    إنشاء جدول جديد الآن
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSyncError(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Overview */}
          <StatsCards
            habits={habits}
            logs={logs}
            selectedDate={selectedDate}
          />

          {/* Navigation & Controls Bar */}
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-3xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* View Switcher Tabs (Daily, Weekly, Analytics) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 w-full sm:w-auto justify-center">
              <button
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>العرض اليومي</span>
              </button>

              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'weekly'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>مصفوفة الأسبوع</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>التحليلات</span>
              </button>
            </div>

            {/* Date Selector (for Daily View) */}
            {activeTab === 'daily' && (
              <div
                onClick={() => setIsCalendarOpen(prev => !prev)}
                className="relative flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-colors cursor-pointer select-none"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevDay();
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                  title="اليوم السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="text-center px-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-slate-200">
                      {isToday ? 'اليوم' : getArabicDayName(selectedDate)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {getArabicDateDisplay(selectedDate)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextDay();
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                  title="اليوم التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {!isToday && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectToday();
                      setIsCalendarOpen(false);
                    }}
                    className="mr-2 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors"
                  >
                    اليوم
                  </button>
                )}

                <div onClick={(e) => e.stopPropagation()}>
                  <CalendarPopover
                    isOpen={isCalendarOpen}
                    onClose={() => setIsCalendarOpen(false)}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => setSelectedDate(date)}
                    habits={habits}
                    logs={logs}
                  />
                </div>
              </div>
            )}

            {/* Category Filter Pills and Scheduled Toggle */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {activeTab === 'daily' && (
                <button
                  type="button"
                  onClick={() => setOnlyScheduledForDay(!onlyScheduledForDay)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    onlyScheduledForDay
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>عادات اليوم فقط</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
                    {scheduledCountForSelectedDate}
                  </span>
                </button>
              )}

              {[
                { id: 'all', label: 'الكل' },
                { id: 'health', label: 'صحة 🏃' },
                { id: 'spiritual', label: 'عبادة 🕌' },
                { id: 'learning', label: 'تعلم 📚' },
                { id: 'productivity', label: 'إنتاجية 💼' },
                { id: 'wellness', label: 'عافية 🌿' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/40 shadow-xs'
                      : 'bg-slate-950/50 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* View Content */}
          {activeTab === 'daily' && (
            <div className="space-y-3">
              {filteredHabits.length > 0 ? (
                filteredHabits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    logs={logs}
                    selectedDate={selectedDate}
                    onToggleComplete={handleToggleComplete}
                    onEditHabit={(h) => {
                      setEditingHabit(h);
                      setIsAddModalOpen(true);
                    }}
                    onDeleteHabit={handleDeleteHabit}
                  />
                ))
              ) : (
                <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-200">لا توجد عادات في هذا التصنيف</h4>
                    <p className="text-xs text-slate-400">أضف عادة جديدة لبدء تتبعها وتوثيقها على Google Sheets.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingHabit(null);
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة عادة الآن</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'weekly' && (
            <WeeklyGridView
              habits={filteredHabits}
              logs={logs}
              selectedDate={selectedDate}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              habits={habits}
              logs={logs}
            />
          )}

        </main>
      )}

      {/* Footer (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <footer className="mt-auto border-t border-slate-900 py-6 text-center text-xs text-slate-400 space-y-1">
          <p>متتبع العادات المتصل بـ Google Sheets & Google Drive</p>
          <p className="text-[11px] text-slate-400">
            يتم حفظ بياناتك وسجلاتك وإحصائياتك مباشرة في حسابك السحابي
          </p>
        </footer>
      )}

      {/* Modals */}
      <AddHabitModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />

      <SheetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        spreadsheetInfo={spreadsheetInfo}
        userEmail={user?.email}
        syncError={syncError?.message}
        isSyncing={isSyncing}
        habits={habits}
        logs={logs}
        onManualSync={handleManualSync}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectCustomId={handleConnectCustomId}
        onDisconnectSheet={handleDisconnectSheet}
        onImportBackup={handleImportBackup}
      />

      <ConfirmationModal
        options={confirmOptions}
        onClose={() => setConfirmOptions(null)}
      />

      {/* Active Habit Reminders Toast Stack */}
      <ReminderToastStack
        reminders={activeReminders}
        onComplete={completeFromReminder}
        onSnooze={snoozeReminder}
        onDismiss={dismissReminder}
      />

      {/* Level-Up Celebration Toast */}
      {levelUpToast && (
        <div
          dir="rtl"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-3xl bg-slate-900/95 backdrop-blur-md border border-amber-500/50 p-4 shadow-2xl shadow-amber-950/40 flex items-center gap-3 animate-in fade-in"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-amber-400">تهانينا! ارتقيت في المستوى</p>
            <p className="text-sm font-black text-slate-100 mt-0.5">
              المستوى {levelUpToast.level} — {levelUpToast.rankTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLevelUpToast(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Floating Connectivity Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600/95 backdrop-blur-md border border-amber-400/40 px-4 py-2 text-xs font-bold text-white shadow-xl">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            وضع عدم الاتصال — جميع التغييرات محفوظة محلياً
            {pendingSyncCount > 0 ? ` (${pendingSyncCount} للمزامنة لاحقاً)` : ''}
          </span>
        </div>
      )}

    </div>
  );
}
