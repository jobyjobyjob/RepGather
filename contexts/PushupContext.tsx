import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DailyLog, PushupGoal, ReminderSettings, generateId, getTodayDateString } from '@/lib/types';
import * as Storage from '@/lib/storage';
import { apiRequest, queryClient } from '@/lib/query-client';

const ACTIVE_GROUP_KEY = 'pushup_pro_active_group';

interface ProgressData {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  totalDays: number;
  dynamicDailyTarget: number;
  planDailyTarget: number;
  todayCount: number;
  streak: number;
}

interface GroupInfo {
  id: string;
  name: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  inviteCode: string;
}

interface PushupContextValue {
  isLoading: boolean;
  goal: PushupGoal | null;
  logs: DailyLog[];
  reminderSettings: ReminderSettings;
  progress: ProgressData | null;
  activeGroupId: string | null;
  activeGroup: GroupInfo | null;
  setGoal: (goal: Omit<PushupGoal, 'id' | 'createdAt'>) => Promise<void>;
  logPushups: (count: number) => Promise<void>;
  updateLog: (date: string, count: number) => Promise<void>;
  deleteLog: (date: string) => Promise<void>;
  updateReminders: (settings: ReminderSettings) => Promise<void>;
  resetChallenge: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveGroup: (groupId: string | null) => Promise<void>;
}

const PushupContext = createContext<PushupContextValue | null>(null);

export function PushupProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<GroupInfo | null>(null);
  const [serverLogs, setServerLogs] = useState<DailyLog[]>([]);
  const [data, setData] = useState<AppData>({
    goal: null,
    logs: [],
    reminderSettings: { enabled: false, times: ['09:00', '14:00', '19:00'] },
  });

  const loadActiveGroupId = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
      if (stored) {
        setActiveGroupIdState(stored);
        return stored;
      }
    } catch {}
    return null;
  }, []);

  const fetchGroupData = useCallback(async (groupId: string) => {
    try {
      const [groupRes, logsRes] = await Promise.all([
        apiRequest("GET", `/api/groups`),
        apiRequest("GET", `/api/logs/${groupId}`),
      ]);
      const groups = await groupRes.json();
      const logs = await logsRes.json();

      const group = groups.find((g: GroupInfo) => g.id === groupId);
      if (group) {
        setActiveGroup(group);
        const mappedLogs: DailyLog[] = logs.map((l: any) => ({
          id: l.id?.toString() || generateId(),
          date: l.date,
          count: l.count,
          createdAt: l.createdAt || new Date().toISOString(),
        }));
        setServerLogs(mappedLogs);
      } else {
        await AsyncStorage.removeItem(ACTIVE_GROUP_KEY);
        setActiveGroupIdState(null);
        setActiveGroup(null);
        setServerLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch group data:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    const appData = await Storage.loadAppData();
    setData(appData);

    const groupId = activeGroupId || await loadActiveGroupId();
    if (groupId) {
      await fetchGroupData(groupId);
    }
    setIsLoading(false);
  }, [activeGroupId, loadActiveGroupId, fetchGroupData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveGroupFn = useCallback(async (groupId: string | null) => {
    if (groupId) {
      await AsyncStorage.setItem(ACTIVE_GROUP_KEY, groupId);
      setActiveGroupIdState(groupId);
      await fetchGroupData(groupId);
    } else {
      await AsyncStorage.removeItem(ACTIVE_GROUP_KEY);
      setActiveGroupIdState(null);
      setActiveGroup(null);
      setServerLogs([]);
    }
  }, [fetchGroupData]);

  const setGoal = useCallback(async (goal: Omit<PushupGoal, 'id' | 'createdAt'>) => {
    await Storage.setGoal(goal);
    await refresh();
  }, [refresh]);

  const logPushups = useCallback(async (count: number) => {
    if (activeGroupId && activeGroup) {
      const today = getTodayDateString();
      await apiRequest("POST", "/api/logs", {
        groupId: activeGroupId,
        date: today,
        count,
      });
      await fetchGroupData(activeGroupId);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeGroupId, 'leaderboard'] });
    } else {
      await Storage.logPushups(count);
      const appData = await Storage.loadAppData();
      setData(appData);
    }
  }, [activeGroupId, activeGroup, fetchGroupData]);

  const updateLog = useCallback(async (date: string, count: number) => {
    if (activeGroupId && activeGroup) {
      await apiRequest("PUT", "/api/logs", {
        groupId: activeGroupId,
        date,
        count,
      });
      await fetchGroupData(activeGroupId);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeGroupId, 'leaderboard'] });
    } else {
      await Storage.updateLogForDate(date, count);
      const appData = await Storage.loadAppData();
      setData(appData);
    }
  }, [activeGroupId, activeGroup, fetchGroupData]);

  const deleteLog = useCallback(async (date: string) => {
    if (activeGroupId && activeGroup) {
      await apiRequest("DELETE", `/api/logs/${activeGroupId}/${date}`);
      await fetchGroupData(activeGroupId);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeGroupId, 'leaderboard'] });
    } else {
      await Storage.deleteLogForDate(date);
      const appData = await Storage.loadAppData();
      setData(appData);
    }
  }, [activeGroupId, activeGroup, fetchGroupData]);

  const updateReminders = useCallback(async (settings: ReminderSettings) => {
    await Storage.updateReminderSettings(settings);
    const appData = await Storage.loadAppData();
    setData(appData);
  }, []);

  const resetChallenge = useCallback(async () => {
    if (activeGroupId) {
      await setActiveGroupFn(null);
    }
    await Storage.resetChallenge();
    const appData = await Storage.loadAppData();
    setData(appData);
  }, [activeGroupId, setActiveGroupFn]);

  const effectiveGoal: PushupGoal | null = useMemo(() => {
    if (activeGroupId && activeGroup) {
      return {
        id: activeGroup.id,
        totalGoal: activeGroup.totalGoal,
        startDate: activeGroup.startDate,
        endDate: activeGroup.endDate,
        planType: 'average' as const,
        createdAt: new Date().toISOString(),
      };
    }
    return data.goal;
  }, [activeGroupId, activeGroup, data.goal]);

  const effectiveLogs = useMemo(() => {
    if (activeGroupId && activeGroup) {
      return serverLogs;
    }
    return data.logs;
  }, [activeGroupId, activeGroup, serverLogs, data.logs]);

  const progress = useMemo(() => {
    if (!effectiveGoal) return null;
    return Storage.calculateProgress(effectiveGoal, effectiveLogs);
  }, [effectiveGoal, effectiveLogs]);

  const value = useMemo(() => ({
    isLoading,
    goal: effectiveGoal,
    logs: effectiveLogs,
    reminderSettings: data.reminderSettings,
    progress,
    activeGroupId,
    activeGroup,
    setGoal,
    logPushups,
    updateLog,
    deleteLog,
    updateReminders,
    resetChallenge,
    refresh,
    setActiveGroup: setActiveGroupFn,
  }), [isLoading, effectiveGoal, effectiveLogs, data.reminderSettings, progress, activeGroupId, activeGroup, setGoal, logPushups, updateLog, deleteLog, updateReminders, resetChallenge, refresh, setActiveGroupFn]);

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
