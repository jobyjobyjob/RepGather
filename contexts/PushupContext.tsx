import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, queryClient } from '@/lib/query-client';
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns';

const ACTIVE_CHALLENGE_KEY = 'repgather_active_challenge';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export interface Challenge {
  id: string;
  name: string;
  exerciseType: string;
  goalType: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  inviteCode: string;
  isPersonal: boolean;
  createdBy: string;
  myIndividualGoal?: number | null;
}

export interface LogEntry {
  id: string;
  date: string;
  count: number;
}

interface ProgressData {
  totalCompleted: number;
  percentComplete: number;
  daysRemaining: number;
  totalDays: number;
  dynamicDailyTarget: number;
  todayCount: number;
  streak: number;
}

interface PushupContextValue {
  isLoading: boolean;
  challenges: Challenge[];
  activeChallengeId: string | null;
  activeChallenge: Challenge | null;
  logs: LogEntry[];
  progress: ProgressData | null;
  setActiveChallenge: (challengeId: string | null) => Promise<void>;
  logActivity: (count: number) => Promise<void>;
  updateLog: (date: string, count: number) => Promise<void>;
  deleteLog: (date: string) => Promise<void>;
  refresh: () => Promise<void>;
  createPersonalChallenge: (data: { name: string; exerciseType: string; totalGoal: number; startDate: string; endDate: string }) => Promise<Challenge>;
  deleteChallenge: (challengeId: string) => Promise<void>;
}

const PushupContext = createContext<PushupContextValue | null>(null);

function calculateProgress(challenge: Challenge, logs: LogEntry[]): ProgressData {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);

  let goalValue = challenge.totalGoal;
  if (challenge.goalType === 'individual' && challenge.myIndividualGoal) {
    goalValue = challenge.myIndividualGoal;
  }

  const percentComplete = goalValue > 0 ? Math.min(100, (totalCompleted / goalValue) * 100) : 0;

  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(challenge.endDate));
  const start = startOfDay(parseISO(challenge.startDate));
  const daysRemaining = Math.max(1, differenceInDays(end, today) + 1);
  const totalDays = differenceInDays(end, start) + 1;

  const remaining = goalValue - totalCompleted;
  const dynamicDailyTarget = remaining <= 0 ? 0 : Math.ceil(remaining / daysRemaining);

  const todayStr = getTodayDateString();
  const todayLog = logs.find(log => log.date === todayStr);
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
    todayCount,
    streak,
  };
}

export function PushupProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallengeId, setActiveChallengeIdState] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const activeChallenge = useMemo(() => {
    if (!activeChallengeId) return null;
    return challenges.find(c => c.id === activeChallengeId) || null;
  }, [challenges, activeChallengeId]);

  const progress = useMemo(() => {
    if (!activeChallenge) return null;
    return calculateProgress(activeChallenge, logs);
  }, [activeChallenge, logs]);

  const fetchChallenges = useCallback(async (): Promise<Challenge[]> => {
    try {
      const res = await apiRequest("GET", "/api/challenges");
      const data = await res.json();
      setChallenges(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  const fetchLogs = useCallback(async (challengeId: string) => {
    try {
      const res = await apiRequest("GET", `/api/logs/${challengeId}`);
      const data = await res.json();
      const mapped: LogEntry[] = data.map((l: any) => ({
        id: l.id?.toString() || Date.now().toString(),
        date: l.date,
        count: l.count,
      }));
      setLogs(mapped);
    } catch {
      setLogs([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const allChallenges = await fetchChallenges();

      let storedId: string | null = null;
      try {
        storedId = await AsyncStorage.getItem(ACTIVE_CHALLENGE_KEY);
      } catch {}

      if (storedId && allChallenges.find(c => c.id === storedId)) {
        setActiveChallengeIdState(storedId);
        await fetchLogs(storedId);
      } else if (allChallenges.length > 0 && !storedId) {
        setActiveChallengeIdState(null);
        setLogs([]);
      } else {
        if (storedId) {
          await AsyncStorage.removeItem(ACTIVE_CHALLENGE_KEY);
        }
        setActiveChallengeIdState(null);
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to refresh challenges:', err);
    }
    setIsLoading(false);
  }, [fetchChallenges, fetchLogs]);

  React.useEffect(() => {
    refresh();
  }, []);

  const setActiveChallenge = useCallback(async (challengeId: string | null) => {
    if (challengeId) {
      await AsyncStorage.setItem(ACTIVE_CHALLENGE_KEY, challengeId);
      setActiveChallengeIdState(challengeId);
      await fetchChallenges();
      await fetchLogs(challengeId);
    } else {
      await AsyncStorage.removeItem(ACTIVE_CHALLENGE_KEY);
      setActiveChallengeIdState(null);
      setLogs([]);
    }
  }, [fetchChallenges, fetchLogs]);

  const logActivity = useCallback(async (count: number) => {
    if (!activeChallengeId) return;
    const today = getTodayDateString();
    await apiRequest("POST", "/api/logs", {
      groupId: activeChallengeId,
      date: today,
      count,
    });
    await fetchLogs(activeChallengeId);
    queryClient.invalidateQueries({ queryKey: ['/api/groups', activeChallengeId, 'leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
  }, [activeChallengeId, fetchLogs]);

  const updateLog = useCallback(async (date: string, count: number) => {
    if (!activeChallengeId) return;
    await apiRequest("PUT", "/api/logs", {
      groupId: activeChallengeId,
      date,
      count,
    });
    await fetchLogs(activeChallengeId);
    queryClient.invalidateQueries({ queryKey: ['/api/groups', activeChallengeId, 'leaderboard'] });
  }, [activeChallengeId, fetchLogs]);

  const deleteLog = useCallback(async (date: string) => {
    if (!activeChallengeId) return;
    await apiRequest("DELETE", `/api/logs/${activeChallengeId}/${date}`);
    await fetchLogs(activeChallengeId);
    queryClient.invalidateQueries({ queryKey: ['/api/groups', activeChallengeId, 'leaderboard'] });
  }, [activeChallengeId, fetchLogs]);

  const createPersonalChallenge = useCallback(async (data: {
    name: string;
    exerciseType: string;
    totalGoal: number;
    startDate: string;
    endDate: string;
  }): Promise<Challenge> => {
    const res = await apiRequest("POST", "/api/challenges/personal", data);
    const challenge = await res.json();
    await fetchChallenges();
    queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    return challenge;
  }, [fetchChallenges]);

  const deleteChallengeAction = useCallback(async (challengeId: string) => {
    await apiRequest("DELETE", `/api/challenges/${challengeId}`);
    if (activeChallengeId === challengeId) {
      await AsyncStorage.removeItem(ACTIVE_CHALLENGE_KEY);
      setActiveChallengeIdState(null);
      setLogs([]);
    }
    await fetchChallenges();
    queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
  }, [activeChallengeId, fetchChallenges]);

  const value = useMemo(() => ({
    isLoading,
    challenges,
    activeChallengeId,
    activeChallenge,
    logs,
    progress,
    setActiveChallenge,
    logActivity,
    updateLog,
    deleteLog,
    refresh,
    createPersonalChallenge,
    deleteChallenge: deleteChallengeAction,
  }), [isLoading, challenges, activeChallengeId, activeChallenge, logs, progress, setActiveChallenge, logActivity, updateLog, deleteLog, refresh, createPersonalChallenge, deleteChallengeAction]);

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
