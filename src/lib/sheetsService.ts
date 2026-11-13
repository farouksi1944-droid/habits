import { Habit, HabitLog, HabitCategory, SpreadsheetInfo } from '../types';

const SPREADSHEET_ID_STORAGE_KEY = 'habitflow_sheets_spreadsheet_id';
const LOCAL_HABITS_KEY = 'habitflow_local_habits';
const LOCAL_LOGS_KEY = 'habitflow_local_logs';

export const INITIAL_DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'شرب 2 لتر ماء 💧',
    category: 'health',
    color: '#06b6d4',
    icon: 'droplets',
    weeklyTarget: 7,
    timeOfDay: 'anytime',
    reminderEnabled: false,
    goalType: 'numeric',
    goalTarget: 2,
    goalUnit: 'لتر',
    goalStep: 0.25,
    createdAt: new Date().toISOString(),
    archived: false,
  },
  {
    id: 'habit-2',
    name: 'أذكار وورد يومي 🕌',
    category: 'spiritual',
    color: '#10b981',
    icon: 'moon',
    weeklyTarget: 7,
    timeOfDay: 'morning',
    reminderTime: '08:00',
    reminderEnabled: true,
    goalType: 'boolean',
    createdAt: new Date().toISOString(),
    archived: false,
  },
  {
    id: 'habit-3',
    name: 'قراءة 20 دقيقة 📚',
    category: 'learning',
    color: '#8b5cf6',
    icon: 'book-open',
    weeklyTarget: 5,
    timeOfDay: 'evening',
    reminderTime: '20:00',
    reminderEnabled: true,
    goalType: 'numeric',
    goalTarget: 20,
    goalUnit: 'دقيقة',
    goalStep: 5,
    createdAt: new Date().toISOString(),
    archived: false,
  },
  {
    id: 'habit-4',
    name: 'مشي أو تمرين 30 دقيقة 🏃',
    category: 'health',
    color: '#f59e0b',
    icon: 'activity',
    weeklyTarget: 5,
    timeOfDay: 'afternoon',
    reminderTime: '16:30',
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
    archived: false,
  },
  {
    id: 'habit-5',
    name: 'النوم قبل 11:30 مساءً 🌙',
    category: 'wellness',
    color: '#6366f1',
    icon: 'sparkles',
    weeklyTarget: 7,
    scheduleType: 'daily',
    timeOfDay: 'evening',
    reminderTime: '23:00',
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
    archived: false,
  },
  {
    id: 'habit-6',
    name: 'مراجعة الرياضيات والتمارين 📐',
    category: 'learning',
    color: '#ec4899',
    icon: 'book-open',
    weeklyTarget: 2,
    scheduleType: 'specific_days',
    targetDays: [0, 2], // 0 = الأحد, 2 = الثلاثاء
    timeOfDay: 'afternoon',
    reminderTime: '17:00',
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
    archived: false,
  },
];

export class SheetsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

/**
 * Extracts a valid Google Spreadsheet ID from either a full Google Sheets URL or a raw ID string.
 */
export const extractSpreadsheetId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match /spreadsheets/d/<ID>
  const pathMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  // Match ?id=<ID>
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  // Match raw ID (no slashes, spaces, or URL schemes)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};

export const getSavedSpreadsheetId = (): string | null => {
  const raw = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
  if (!raw) return null;
  const cleanId = extractSpreadsheetId(raw);
  if (!cleanId) {
    localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
    return null;
  }
  return cleanId;
};

export const saveSpreadsheetId = (id: string) => {
  const cleanId = extractSpreadsheetId(id) || id.trim();
  localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, cleanId);
};

export const clearSpreadsheetId = () => {
  localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
};

export const getLocalHabits = (): Habit[] => {
  try {
    const raw = localStorage.getItem(LOCAL_HABITS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local habits:', e);
  }
  return INITIAL_DEFAULT_HABITS;
};

export const saveLocalHabits = (habits: Habit[]) => {
  localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(habits));
};

export const getLocalLogs = (): HabitLog[] => {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local logs:', e);
  }
  return [];
};

export const saveLocalLogs = (logs: HabitLog[]) => {
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
};

// --- Offline Sync Queue ---
const PENDING_SYNC_KEY = 'habitflow_pending_sync';

export interface PendingSyncQueue {
  habitsDirty: boolean;
  pendingLogs: {
    habitId: string;
    habitName: string;
    date: string;
    completed: boolean;
    progressValue?: number;
    notes: string;
  }[];
}

export const getPendingSyncQueue = (): PendingSyncQueue => {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse pending sync queue:', e);
  }
  return { habitsDirty: false, pendingLogs: [] };
};

export const savePendingSyncQueue = (queue: PendingSyncQueue) => {
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
};

export const getPendingSyncCount = (): number => {
  const q = getPendingSyncQueue();
  return (q.habitsDirty ? 1 : 0) + q.pendingLogs.length;
};

export const queueHabitsSync = () => {
  const q = getPendingSyncQueue();
  q.habitsDirty = true;
  savePendingSyncQueue(q);
};

export const queueLogSync = (entry: {
  habitId: string;
  habitName: string;
  date: string;
  completed: boolean;
  progressValue?: number;
  notes?: string;
}) => {
  const q = getPendingSyncQueue();
  // Deduplicate same habitId+date in pending queue, keeping latest state
  const filtered = q.pendingLogs.filter(
    item => !(item.habitId === entry.habitId && item.date === entry.date)
  );
  filtered.push({
    habitId: entry.habitId,
    habitName: entry.habitName,
    date: entry.date,
    completed: entry.completed,
    progressValue: entry.progressValue,
    notes: entry.notes || '',
  });
  q.pendingLogs = filtered;
  savePendingSyncQueue(q);
};

export const clearPendingSyncQueue = () => {
  localStorage.removeItem(PENDING_SYNC_KEY);
};

let inFlightCreatePromise: Promise<SpreadsheetInfo> | null = null;

/**
 * Searches Google Drive (within files accessible via drive.file scope) for an existing
 * HabitFlow spreadsheet so publishing on a new domain seamlessly reconnects to the user's sheet.
 */
export const findExistingHabitSpreadsheet = async (
  accessToken: string
): Promise<{ id: string; name: string } | null> => {
  try {
    const q = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains 'HabitFlow'"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=5&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.files?.[0];
    if (first?.id) {
      return { id: String(first.id), name: String(first.name || 'متتبع العادات (Google Sheets)') };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Creates a brand new Habit Tracker Spreadsheet in the user's Google Drive via Google Sheets API v4
 */
export const createHabitSpreadsheet = async (accessToken: string): Promise<SpreadsheetInfo> => {
  if (inFlightCreatePromise) {
    return inFlightCreatePromise;
  }

  inFlightCreatePromise = (async () => {
    const title = `🎯 متتبع العادات - HabitFlow Tracker (${new Date().toLocaleDateString('ar-EG')})`;
    
    const payload = {
      properties: {
        title,
        locale: 'ar_SA',
        autoRecalc: 'ON_CHANGE',
      },
      sheets: [
        {
          properties: {
            title: 'العادات_Habits',
            gridProperties: {
              frozenRowCount: 1,
              rowCount: 200,
              columnCount: 16,
            },
            tabColor: { red: 0.02, green: 0.72, blue: 0.51 }, // Emerald
          },
        },
        {
          properties: {
            title: 'السجل_Logs',
            gridProperties: {
              frozenRowCount: 1,
              rowCount: 5000,
              columnCount: 8,
            },
            tabColor: { red: 0.25, green: 0.52, blue: 0.96 }, // Blue
          },
        },
        {
          properties: {
            title: 'دليل_الاستخدام_Guide',
            gridProperties: {
              rowCount: 50,
              columnCount: 6,
            },
            tabColor: { red: 0.55, green: 0.36, blue: 0.96 }, // Purple
          },
        },
      ],
    };

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new SheetsApiError(
        err.error?.message || 'فشل في إنشاء جدول بيانات Google Sheets',
        response.status
      );
    }

    const sheetData = await response.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Now seed initial headers and style
    await seedSpreadsheetData(accessToken, spreadsheetId);

    saveSpreadsheetId(spreadsheetId);

    return {
      id: spreadsheetId,
      title,
      url: spreadsheetUrl,
      lastSyncedAt: new Date().toISOString(),
    };
  })();

  try {
    return await inFlightCreatePromise;
  } finally {
    inFlightCreatePromise = null;
  }
};

const HABITS_SHEET = 'العادات_Habits';
const LOGS_SHEET = 'السجل_Logs';
const GUIDE_SHEET = 'دليل_الاستخدام_Guide';

const sheetRange = (title: string, a1: string): string => `'${title}'!${a1}`;

/**
 * Ensures an existing Google Spreadsheet has the required HabitFlow tabs and headers.
 */
export const ensureSpreadsheetSchema = async (
  accessToken: string,
  spreadsheetId: string
): Promise<void> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new SheetsApiError('معرف جدول Google Sheets غير صالح', 400);
  }

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new SheetsApiError(
      err.error?.message || 'تعذر الوصول إلى جدول Google Sheets',
      metaRes.status
    );
  }

  const meta = await metaRes.json();
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: any) => s?.properties?.title).filter(Boolean)
  );

  const missingHabits = !existingTitles.has(HABITS_SHEET);
  const missingLogs = !existingTitles.has(LOGS_SHEET);

  if (!missingHabits && !missingLogs) {
    return;
  }

  const addRequests: any[] = [];
  if (missingHabits) {
    addRequests.push({
      addSheet: {
        properties: {
          title: HABITS_SHEET,
          gridProperties: { frozenRowCount: 1, rowCount: 200, columnCount: 16 },
          tabColor: { red: 0.02, green: 0.72, blue: 0.51 },
        },
      },
    });
  }
  if (missingLogs) {
    addRequests.push({
      addSheet: {
        properties: {
          title: LOGS_SHEET,
          gridProperties: { frozenRowCount: 1, rowCount: 5000, columnCount: 8 },
          tabColor: { red: 0.25, green: 0.52, blue: 0.96 },
        },
      },
    });
  }

  const batchCreateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addRequests }),
    }
  );

  if (!batchCreateRes.ok) {
    const err = await batchCreateRes.json().catch(() => ({}));
    throw new SheetsApiError(
      err.error?.message || 'فشل في تجهيز أوراق الجدول في Google Sheets',
      batchCreateRes.status
    );
  }

  await seedSpreadsheetData(accessToken, cleanId, {
    includeHabits: missingHabits,
    includeLogs: missingLogs,
    includeGuide: false,
  });
};

/**
 * Writes headers and initial habits into the spreadsheet
 */
const seedSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string,
  options: { includeHabits?: boolean; includeLogs?: boolean; includeGuide?: boolean } = {}
) => {
  const { includeHabits = true, includeLogs = true, includeGuide = true } = options;

  const habitsHeaders = [
    [
      'معرف_العادة', 'اسم_العادة', 'التصنيف', 'اللون', 'الأيقونة',
      'الهدف_الأسبوعي', 'وقت_اليوم', 'تاريخ_الإنشاء', 'الحالة',
      'نوع_الجدولة', 'الأيام_المحددة', 'وقت_التذكير',
      'نوع_الهدف', 'قيمة_الهدف', 'وحدة_الهدف', 'مقدار_الزيادة'
    ]
  ];

  const logsHeaders = [
    ['معرف_العادة', 'اسم_العادة', 'التاريخ', 'الحالة_مكتملة', 'ملاحظات', 'تاريخ_المزامنة', 'التقدم_الرقمي']
  ];

  const guideContent = [
    ['🌟 مرحباً بك في متتبع العادات الذكي (HabitFlow Tracker)'],
    ['تم إنشاء هذا الجدول تلقائياً وربطه بتطبيق تتبع العادات الخاص بك.'],
    [''],
    ['💡 كيف يعمل هذا الجدول؟'],
    ['1. ورقة "العادات_Habits": تحتوي على قائمة بجميع عاداتك النشطة، وتحديد الأيام المخصصة لكل عادة أو تكرارها اليومي، والأهداف الرقمية التراكمية.'],
    ['2. ورقة "السجل_Logs": تسجل كل مرة تقوم فيها بإنهاء عادة أو تحديث تقدمها الرقمي في أي تاريخ محدد.'],
    ['3. يمكنك الاطلاع على بياناتك هنا في أي وقت أو تصديرها وطباعتها بسهولة.'],
    [''],
    ['تاريخ الإنشاء:', new Date().toLocaleString('ar-EG')],
  ];

  const initialData: { range: string; values: (string | number | boolean)[][] }[] = [];

  if (includeHabits) {
    initialData.push({
      range: sheetRange(HABITS_SHEET, 'A1:P1'),
      values: habitsHeaders,
    });
  }
  if (includeLogs) {
    initialData.push({
      range: sheetRange(LOGS_SHEET, 'A1:G1'),
      values: logsHeaders,
    });
  }
  if (includeGuide) {
    initialData.push({
      range: sheetRange(GUIDE_SHEET, 'A1:B9'),
      values: guideContent,
    });
  }

  // Also seed default habits when seeding habits tab
  if (includeHabits) {
    const defaultHabits = getLocalHabits();
    const habitRows = defaultHabits.map(h => [
      h.id,
      h.name,
      h.category,
      h.color,
      h.icon,
      h.weeklyTarget,
      h.timeOfDay,
      h.createdAt,
      h.archived ? 'مؤرشف' : 'نشط',
      h.scheduleType || 'daily',
      h.targetDays ? h.targetDays.join(',') : '',
      h.reminderEnabled === false ? 'off' : (h.reminderTime || ''),
      h.goalType || 'boolean',
      h.goalTarget ?? '',
      h.goalUnit || '',
      h.goalStep ?? '',
    ]);

    if (habitRows.length > 0) {
      initialData.push({
        range: sheetRange(HABITS_SHEET, `A2:P${habitRows.length + 1}`),
        values: habitRows,
      });
    }
  }

  // Also seed any existing local logs when seeding logs tab
  if (includeLogs) {
    const localLogs = getLocalLogs();
    if (localLogs.length > 0) {
      const logRows = localLogs.map(l => [
        l.habitId,
        l.habitName,
        l.date,
        l.completed ? 'نعم' : 'لا',
        l.notes || '',
        new Date().toISOString(),
        l.progressValue ?? '',
      ]);
      initialData.push({
        range: sheetRange(LOGS_SHEET, `A2:G${logRows.length + 1}`),
        values: logRows,
      });
    }
  }

  if (initialData.length === 0) return;

  const seedRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: initialData,
    }),
  });
  if (!seedRes.ok) {
    const err = await seedRes.json().catch(() => ({}));
    throw new SheetsApiError(
      err.error?.message || 'فشل في تهيئة أعمدة جدول Google Sheets',
      seedRes.status
    );
  }
};

/**
 * Fetches habits and logs from Google Sheets
 */
export const syncFromSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ habits: Habit[]; logs: HabitLog[] }> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new SheetsApiError('معرف جدول Google Sheets غير صالح', 400);
  }

  // Ensure tabs exist (handles newly linked blank spreadsheets or missing tabs)
  await ensureSpreadsheetSchema(accessToken, cleanId);

  const ranges = [
    sheetRange(HABITS_SHEET, 'A2:P500'),
    sheetRange(LOGS_SHEET, 'A2:G5000'),
  ];
  const query = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new SheetsApiError(
      err.error?.message || 'تعذر جلب البيانات من جدول Google Sheets',
      response.status
    );
  }

  const result = await response.json();
  const habitsRange = result.valueRanges?.[0]?.values || [];
  const logsRange = result.valueRanges?.[1]?.values || [];

  const habits: Habit[] = habitsRange
    .filter((row: any[]) => row && row[0] && row[1])
    .map((row: any[]) => {
      const scheduleType = (row[9] as any) === 'specific_days' ? 'specific_days' : 'daily';
      const targetDaysStr = row[10] ? String(row[10]).trim() : '';
      const targetDays = targetDaysStr
        ? targetDaysStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
        : undefined;

      const rawReminder = row[11] ? String(row[11]).trim() : '';
      const reminderEnabled = rawReminder === 'off' ? false : rawReminder ? true : undefined;
      const reminderTime = rawReminder && rawReminder !== 'off' ? rawReminder : undefined;

      const goalType = row[12] === 'numeric' ? 'numeric' : 'boolean';
      const goalTargetNum = row[13] !== undefined && row[13] !== '' ? Number(row[13]) : undefined;
      const goalUnit = row[14] ? String(row[14]).trim() : undefined;
      const goalStepNum = row[15] !== undefined && row[15] !== '' ? Number(row[15]) : undefined;

      return {
        id: String(row[0]),
        name: String(row[1]),
        category: (row[2] as HabitCategory) || 'wellness',
        color: String(row[3] || '#10b981'),
        icon: String(row[4] || 'check-circle'),
        weeklyTarget: Number(row[5]) || 7,
        timeOfDay: (row[6] as any) || 'anytime',
        reminderTime,
        reminderEnabled,
        goalType,
        goalTarget: goalTargetNum && !isNaN(goalTargetNum) ? goalTargetNum : undefined,
        goalUnit,
        goalStep: goalStepNum && !isNaN(goalStepNum) ? goalStepNum : undefined,
        createdAt: String(row[7] || new Date().toISOString()),
        archived: row[8] === 'مؤرشف' || row[8] === 'archived',
        scheduleType,
        targetDays,
      };
    });

  // Keep the latest appended row per (habitId, date)
  const latestLogsMap = new Map<string, HabitLog>();
  for (const row of logsRange) {
    if (!row || !row[0] || !row[2]) continue;
    const habitId = String(row[0]);
    const date = String(row[2]);
    const rawProgress = row[6] !== undefined && row[6] !== '' ? Number(row[6]) : undefined;
    latestLogsMap.set(`${habitId}__${date}`, {
      habitId,
      habitName: String(row[1] || ''),
      date,
      completed: row[3] === 'نعم' || row[3] === 'TRUE' || row[3] === true || row[3] === '1',
      notes: String(row[4] || ''),
      updatedAt: String(row[5] || ''),
      progressValue: rawProgress !== undefined && !isNaN(rawProgress) ? rawProgress : undefined,
    });
  }
  const logs: HabitLog[] = Array.from(latestLogsMap.values());

  saveLocalHabits(habits.length > 0 ? habits : getLocalHabits());
  saveLocalLogs(logs);

  return { habits: habits.length > 0 ? habits : getLocalHabits(), logs };
};

/**
 * Appends a new habit to the spreadsheet
 */
export const appendHabitToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  habit: Habit
) => {
  const row = [
    habit.id,
    habit.name,
    habit.category,
    habit.color,
    habit.icon,
    habit.weeklyTarget,
    habit.timeOfDay,
    habit.createdAt,
    habit.archived ? 'مؤرشف' : 'نشط',
    habit.scheduleType || 'daily',
    habit.targetDays ? habit.targetDays.join(',') : '',
    habit.reminderEnabled === false ? 'off' : (habit.reminderTime || ''),
    habit.goalType || 'boolean',
    habit.goalTarget ?? '',
    habit.goalUnit || '',
    habit.goalStep ?? '',
  ];

  const appendRange = encodeURIComponent(sheetRange(HABITS_SHEET, 'A:P'));
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );
  if (!res.ok) {
    throw new Error('Failed to append habit to Google Sheets');
  }
};

/**
 * Overwrites all habits into the spreadsheet (used when editing, sorting, or deleting/archiving)
 */
export const updateAllHabitsInSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  habits: Habit[]
) => {
  // Clear existing rows A2:P500
  const clearRange = encodeURIComponent(sheetRange(HABITS_SHEET, 'A2:P500'));
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!clearRes.ok) {
    throw new Error('Failed to clear habits range in Google Sheets');
  }

  const rows = habits.map(h => [
    h.id,
    h.name,
    h.category,
    h.color,
    h.icon,
    h.weeklyTarget,
    h.timeOfDay,
    h.createdAt,
    h.archived ? 'مؤرشف' : 'نشط',
    h.scheduleType || 'daily',
    h.targetDays ? h.targetDays.join(',') : '',
    h.reminderEnabled === false ? 'off' : (h.reminderTime || ''),
    h.goalType || 'boolean',
    h.goalTarget ?? '',
    h.goalUnit || '',
    h.goalStep ?? '',
  ]);

  if (rows.length > 0) {
    const putRange = encodeURIComponent(sheetRange(HABITS_SHEET, `A2:P${rows.length + 1}`));
    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${putRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
    if (!putRes.ok) {
      throw new Error('Failed to update habits in Google Sheets');
    }
  }
};

/**
 * Saves or updates a log entry in Google Sheets
 */
export const recordLogToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  habitId: string,
  habitName: string,
  date: string,
  completed: boolean,
  notes: string = '',
  progressValue?: number
) => {
  const row = [
    habitId,
    habitName,
    date,
    completed ? 'نعم' : 'لا',
    notes,
    new Date().toISOString(),
    progressValue ?? '',
  ];

  // We append log rows to preserve history
  const logsAppendRange = encodeURIComponent(sheetRange(LOGS_SHEET, 'A:G'));
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${logsAppendRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );
  if (!res.ok) {
    throw new Error('Failed to record log to Google Sheets');
  }
};

/**
 * Flushes any offline-queued habit edits and logs to Google Sheets once connected.
 */
export const flushPendingSync = async (
  accessToken: string,
  spreadsheetId: string,
  currentHabits: Habit[]
): Promise<boolean> => {
  const queue = getPendingSyncQueue();
  if (!queue.habitsDirty && queue.pendingLogs.length === 0) {
    return false;
  }

  await ensureSpreadsheetSchema(accessToken, spreadsheetId);

  if (queue.habitsDirty) {
    await updateAllHabitsInSpreadsheet(accessToken, spreadsheetId, currentHabits);
  }

  if (queue.pendingLogs.length > 0) {
    const rows = queue.pendingLogs.map(item => [
      item.habitId,
      item.habitName,
      item.date,
      item.completed ? 'نعم' : 'لا',
      item.notes || '',
      new Date().toISOString(),
      item.progressValue ?? '',
    ]);

    const logsAppendRange = encodeURIComponent(sheetRange(LOGS_SHEET, 'A:G'));
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${logsAppendRange}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
    if (!res.ok) {
      throw new Error('Failed to flush offline logs to Google Sheets');
    }
  }

  clearPendingSyncQueue();
  return true;
};
