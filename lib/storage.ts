import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DailyLog, PushupGoal, ReminderSettings, generateId, getTodayDateString, PlanType } from './types';
import { differenceInDays, parseISO, eachDayOfInterval, startOfDay, format } from 'date-fns';

const STORAGE_KEY = 'pushup_pro_data';

const defaultData: AppData = {
  goal: null,
  logs: [],
  reminderSettings: {
    enabled: false,
    times: ['09:00', '14:00', '19:00'],
  },
};

export async function loadAppData(): Promise<AppData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return defaultData;
  } catch (error) {
    console.error('Error loading data:', error);
    return defaultData;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

export async function setGoal(goal: Omit<PushupGoal, 'id' | 'createdAt'>): Promise<PushupGoal> {
  const data = await loadAppData();
  const newGoal: PushupGoal = {
    ...goal,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.goal = newGoal;
  data.logs = [];
  await saveAppData(data);
  return newGoal;
}

export async function logPushups(count: number): Promise<DailyLog> {
  const data = await loadAppData();
  const today = getTodayDateString();
  
  const existingIndex = data.logs.findIndex(log => log.date === today);
  
  if (existingIndex >= 0) {
    data.logs[existingIndex].count += count;
    await saveAppData(data);
    return data.logs[existingIndex];
  } else {
    const newLog: DailyLog = {
      id: generateId(),
      date: today,
      count,
      createdAt: new Date().toISOString(),
    };
    data.logs.push(newLog);
    await saveAppData(data);
    return newLog;
  }
}

export async function updateLogForDate(date: string, count: number): Promise<DailyLog> {
  const data = await loadAppData();
  
  const existingIndex = data.logs.findIndex(log => log.date === date);
  
  if (existingIndex >= 0) {
    data.logs[existingIndex].count = count;
    await saveAppData(data);
    return data.logs[existingIndex];
  } else {
    const newLog: DailyLog = {
      id: generateId(),
      date,
      count,
      createdAt: new Date().toISOString(),
    };
    data.logs.push(newLog);
    await saveAppData(data);
    return newLog;
  }
}

export async function deleteLogForDate(date: string): Promise<void> {
  const data = await loadAppData();
  data.logs = data.logs.filter(log => log.date !== date);
  await saveAppData(data);
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<void> {
  const data = await loadAppData();
  data.reminderSettings = settings;
  await saveAppData(data);
}

export async function resetChallenge(): Promise<void> {
  const data = await loadAppData();
  data.goal = null;
  data.logs = [];
  await saveAppData(data);
}

export function getDaysRemainingIncludingToday(goal: PushupGoal): number {
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(goal.endDate));
  return Math.max(1, differenceInDays(end, today) + 1);
}

export function getTotalDays(goal: PushupGoal): number {
  const start = startOfDay(parseISO(goal.startDate));
  const end = startOfDay(parseISO(goal.endDate));
  return differenceInDays(end, start) + 1;
}

export function calculateDynamicDailyTarget(
  goal: PushupGoal, 
  logs: DailyLog[]
): number {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);
  const remaining = goal.totalGoal - totalCompleted;
  
  if (remaining <= 0) return 0;
  
  const daysLeft = getDaysRemainingIncludingToday(goal);
  return Math.ceil(remaining / daysLeft);
}

export function calculatePlanTarget(
  goal: PushupGoal,
  forDate?: string
): number {
  const targetDate = forDate ? parseISO(forDate) : new Date();
  const startDate = parseISO(goal.startDate);
  const endDate = parseISO(goal.endDate);
  
  const totalDays = differenceInDays(endDate, startDate) + 1;
  
  if (goal.planType === 'custom' && goal.customDailyTarget) {
    return goal.customDailyTarget;
  }
  
  if (goal.planType === 'average') {
    return Math.ceil(goal.totalGoal / totalDays);
  }
  
  if (goal.planType === 'increasing') {
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const numWeeks = Math.ceil(totalDays / 7);
    const dayIndex = Math.max(0, differenceInDays(startOfDay(targetDate), startOfDay(startDate)));
    const currentWeekIndex = Math.min(numWeeks - 1, Math.floor(dayIndex / 7));
    
    let totalWeight = 0;
    for (let i = 0; i < numWeeks; i++) {
      const multiplier = 1 + (i * 0.5);
      const weekStart = i * 7;
      const weekEnd = Math.min(weekStart + 7, totalDays);
      const daysInWeek = weekEnd - weekStart;
      totalWeight += multiplier * daysInWeek;
    }
    
    const basePerDay = goal.totalGoal / totalWeight;
    const currentMultiplier = 1 + (currentWeekIndex * 0.5);
    
    return Math.ceil(basePerDay * currentMultiplier);
  }
  
  return Math.ceil(goal.totalGoal / totalDays);
}

export function calculateProgress(goal: PushupGoal, logs: DailyLog[]): {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  totalDays: number;
  dynamicDailyTarget: number;
  planDailyTarget: number;
  todayCount: number;
  streak: number;
} {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);
  const percentComplete = Math.min(100, (totalCompleted / goal.totalGoal) * 100);
  
  const daysRemaining = getDaysRemainingIncludingToday(goal);
  const totalDays = getTotalDays(goal);
  
  const dynamicDailyTarget = calculateDynamicDailyTarget(goal, logs);
  const planDailyTarget = calculatePlanTarget(goal);
  
  const today = getTodayDateString();
  const todayLog = logs.find(log => log.date === today);
  const todayCount = todayLog?.count || 0;
  
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let checkDate = new Date();
  
  for (let i = 0; i < 366; i++) {
    const expectedDate = format(checkDate, 'yyyy-MM-dd');
    const log = sortedLogs.find(l => l.date === expectedDate);
    
    if (log && log.count > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return {
    totalCompleted,
    percentComplete,
    daysRemaining,
    totalDays,
    dynamicDailyTarget,
    planDailyTarget,
    todayCount,
    streak,
  };
}
