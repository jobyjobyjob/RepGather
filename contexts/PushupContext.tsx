import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppData, DailyLog, PushupGoal, ReminderSettings } from '@/lib/types';
import * as Storage from '@/lib/storage';

interface ProgressData {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  dailyTarget: number;
  todayCount: number;
  streak: number;
}

interface PushupContextValue {
  isLoading: boolean;
  goal: PushupGoal | null;
  logs: DailyLog[];
  reminderSettings: ReminderSettings;
  progress: ProgressData | null;
  setGoal: (goal: Omit<PushupGoal, 'id' | 'createdAt'>) => Promise<void>;
  logPushups: (count: number) => Promise<void>;
  updateLog: (date: string, count: number) => Promise<void>;
  deleteLog: (date: string) => Promise<void>;
  updateReminders: (settings: ReminderSettings) => Promise<void>;
  resetChallenge: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PushupContext = createContext<PushupContextValue | null>(null);

export function PushupProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AppData>({
    goal: null,
    logs: [],
    reminderSettings: { enabled: false, times: ['09:00', '14:00', '19:00'] },
  });

  const refresh = useCallback(async () => {
    const appData = await Storage.loadAppData();
    setData(appData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setGoal = useCallback(async (goal: Omit<PushupGoal, 'id' | 'createdAt'>) => {
    await Storage.setGoal(goal);
    await refresh();
  }, [refresh]);

  const logPushups = useCallback(async (count: number) => {
    await Storage.logPushups(count);
    await refresh();
  }, [refresh]);

  const updateLog = useCallback(async (date: string, count: number) => {
    await Storage.updateLogForDate(date, count);
    await refresh();
  }, [refresh]);

  const deleteLog = useCallback(async (date: string) => {
    await Storage.deleteLogForDate(date);
    await refresh();
  }, [refresh]);

  const updateReminders = useCallback(async (settings: ReminderSettings) => {
    await Storage.updateReminderSettings(settings);
    await refresh();
  }, [refresh]);

  const resetChallenge = useCallback(async () => {
    await Storage.resetChallenge();
    await refresh();
  }, [refresh]);

  const progress = useMemo(() => {
    if (!data.goal) return null;
    return Storage.calculateProgress(data.goal, data.logs);
  }, [data.goal, data.logs]);

  const value = useMemo(() => ({
    isLoading,
    goal: data.goal,
    logs: data.logs,
    reminderSettings: data.reminderSettings,
    progress,
    setGoal,
    logPushups,
    updateLog,
    deleteLog,
    updateReminders,
    resetChallenge,
    refresh,
  }), [isLoading, data, progress, setGoal, logPushups, updateLog, deleteLog, updateReminders, resetChallenge, refresh]);

  return (
    <PushupContext.Provider value={value}>
      {children}
    </PushupContext.Provider>
  );
}

export function usePushups() {
  const context = useContext(PushupContext);
  if (!context) {
    throw new Error('usePushups must be used within a PushupProvider');
  }
  return context;
}
