import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DailyLog, PushupGoal, ReminderSettings, generateId, getTodayDateString } from './types';

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

export async function getTodayLog(): Promise<DailyLog | null> {
  const data = await loadAppData();
  const today = getTodayDateString();
  return data.logs.find(log => log.date === today) || null;
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<void> {
  const data = await loadAppData();
  data.reminderSettings = settings;
  await saveAppData(data);
}

export async function resetChallenge(): Promise<void> {
  await saveAppData(defaultData);
}

export function calculateDailyTarget(goal: PushupGoal, totalCompleted: number): number {
  const now = new Date();
  const end = new Date(goal.endDate);
  const remaining = goal.totalGoal - totalCompleted;
  
  if (remaining <= 0) return 0;
  
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.ceil(remaining / daysLeft);
}

export function calculateProgress(goal: PushupGoal, logs: DailyLog[]): {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  dailyTarget: number;
  todayCount: number;
  streak: number;
} {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);
  const percentComplete = Math.min(100, (totalCompleted / goal.totalGoal) * 100);
  
  const now = new Date();
  const end = new Date(goal.endDate);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const dailyTarget = calculateDailyTarget(goal, totalCompleted);
  
  const today = getTodayDateString();
  const todayLog = logs.find(log => log.date === today);
  const todayCount = todayLog?.count || 0;
  
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  let checkDate = new Date();
  
  for (const log of sortedLogs) {
    const logDate = log.date;
    const expectedDate = checkDate.toISOString().split('T')[0];
    
    if (logDate === expectedDate && log.count > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (logDate < expectedDate) {
      break;
    }
  }
  
  return {
    totalCompleted,
    percentComplete,
    daysRemaining,
    dailyTarget,
    todayCount,
    streak,
  };
}
