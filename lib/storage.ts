import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DailyLog, PushupGoal, ReminderSettings, generateId, getTodayDateString, PlanType } from './types';
import { differenceInDays, parseISO, eachDayOfInterval, getISOWeek, startOfDay } from 'date-fns';

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

export function calculateDynamicDailyTarget(
  goal: PushupGoal, 
  logs: DailyLog[],
  forDate?: string
): number {
  const targetDate = forDate ? parseISO(forDate) : new Date();
  const endDate = parseISO(goal.endDate);
  
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);
  const remaining = goal.totalGoal - totalCompleted;
  
  if (remaining <= 0) return 0;
  
  const today = startOfDay(new Date());
  const target = startOfDay(targetDate);
  const end = startOfDay(endDate);
  
  const daysLeft = Math.max(1, differenceInDays(end, today) + 1);
  
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
    const weekNumbers: number[] = [];
    
    allDays.forEach(day => {
      const weekNum = getISOWeek(day);
      if (!weekNumbers.includes(weekNum)) {
        weekNumbers.push(weekNum);
      }
    });
    
    const numWeeks = weekNumbers.length;
    const dayIndex = differenceInDays(targetDate, startDate);
    const dayWeekNum = getISOWeek(targetDate);
    const currentWeekIndex = weekNumbers.indexOf(dayWeekNum);
    
    if (currentWeekIndex === -1 || dayIndex < 0 || dayIndex >= totalDays) {
      return Math.ceil(goal.totalGoal / totalDays);
    }
    
    const weeklyMultipliers: number[] = [];
    let totalWeight = 0;
    for (let i = 0; i < numWeeks; i++) {
      const multiplier = 1 + (i * 0.5);
      weeklyMultipliers.push(multiplier);
      
      const daysInThisWeek = allDays.filter(d => getISOWeek(d) === weekNumbers[i]).length;
      totalWeight += multiplier * daysInThisWeek;
    }
    
    const basePerDay = goal.totalGoal / totalWeight;
    const currentMultiplier = weeklyMultipliers[currentWeekIndex];
    
    return Math.ceil(basePerDay * currentMultiplier);
  }
  
  return Math.ceil(goal.totalGoal / totalDays);
}

export function calculateProgress(goal: PushupGoal, logs: DailyLog[]): {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  dynamicDailyTarget: number;
  planDailyTarget: number;
  todayCount: number;
  streak: number;
} {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);
  const percentComplete = Math.min(100, (totalCompleted / goal.totalGoal) * 100);
  
  const now = new Date();
  const end = parseISO(goal.endDate);
  const daysRemaining = Math.max(0, differenceInDays(end, now) + 1);
  
  const dynamicDailyTarget = calculateDynamicDailyTarget(goal, logs);
  const planDailyTarget = calculatePlanTarget(goal);
  
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
    dynamicDailyTarget,
    planDailyTarget,
    todayCount,
    streak,
  };
}
