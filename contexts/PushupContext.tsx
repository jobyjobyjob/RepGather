import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, queryClient } from '@/lib/query-client';
import { differenceInDays, parseISO } from 'date-fns';

const ACTIVE_CHALLENGE_KEY = 'repgather_active_challenge';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface Challenge {
  id: string;
  name: string;
  exerciseType: string;
  goalType: string;
  totalGoal: number;
  originalTotalGoal?: number | null;
  targetStyle?: string;
  startDate: string;
  endDate: string;
  inviteCode: string;
  isPersonal: boolean;
  status?: string;
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
  isDebtActive: boolean;
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
  completeChallenge: (challengeId: string) => Promise<void>;
}

const PushupContext = createContext<PushupContextValue | null>(null);

function getModeMultiplier(challenge: Challenge, todayStr: string): number {
  const style = challenge.targetStyle || 'even';
  if (style === 'even') return 1;

  if (style === 'ascent') {
    const start = parseISO(challenge.startDate);
    const end = parseISO(challenge.endDate);
    const today = parseISO(todayStr);
    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    const dayIndex = Math.max(0, differenceInDays(today, start));
    const progress = dayIndex / totalDays;
    if (progress < 0.25) return 0.7;
    if (progress < 0.5) return 0.9;
    if (progress < 0.75) return 1.1;
    return 1.3;
  }

  const dayOfWeek = parseISO(todayStr).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (style === 'weekday_warrior') {
    return isWeekend ? 0.375 : 1.25;
  }

  if (style === 'weekender') {
    return isWeekend ? 1.625 : 0.75;
  }

  return 1;
}

function calculateProgress(challenge: Challenge, logs: LogEntry[]): ProgressData {
  const totalCompleted = logs.reduce((sum, log) => sum + log.count, 0);

  let goalValue = challenge.totalGoal;
  if (challenge.goalType === 'individual' && challenge.myIndividualGoal) {
    goalValue = challenge.myIndividualGoal;
  }

  const percentComplete = goalValue > 0 ? (totalCompleted / goalValue) * 100 : 0;

  const todayStr = getTodayDateString();
  const todayLocal = parseISO(todayStr);
  const end = parseISO(challenge.endDate);
  const start = parseISO(challenge.startDate);
  const daysAfterToday = Math.max(0, differenceInDays(end, todayLocal));
  const totalDays = differenceInDays(end, start) + 1;
  const daysRemaining = daysAfterToday;

  const remaining = goalValue - totalCompleted;
  const daysForTarget = Math.max(1, daysRemaining + 1);
  const baseTarget = remaining <= 0 ? 0 : Math.ceil(remaining / daysForTarget);

  const multiplier = getModeMultiplier(challenge, todayStr);
  const dynamicDailyTarget = remaining <= 0 ? 0 : Math.ceil(baseTarget * multiplier);

  const originalGoal = challenge.originalTotalGoal || goalValue;
  const originalDailyPace = totalDays > 0 ? originalGoal / totalDays : 0;
  const elapsedDays = Math.max(0, differenceInDays(todayLocal, start));
  const expectedByNow = Math.ceil(originalDailyPace * elapsedDays);
  const isDebtActive = totalCompleted < expectedByNow && remaining > 0;

  const todayLog = logs.find(log => log.date === todayStr);
  const todayCount = todayLog?.count || 0;

  const logsByDate = new Map(logs.map(l => [l.date, l]));
  let streak = 0;
  const checkDate = new Date();
  const checkDateStr = getTodayDateString();
  if (logsByDate.has(checkDateStr) && (logsByDate.get(checkDateStr)?.count ?? 0) > 0) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  for (let i = 0; i < 366; i++) {
    const yr = checkDate.getFullYear();
    const mo = String(checkDate.getMonth() + 1).padStart(2, '0');
    const dy = String(checkDate.getDate()).padStart(2, '0');
    const expectedDate = `${yr}-${mo}-${dy}`;
    const log = logsByDate.get(expectedDate);
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
    isDebtActive,
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
    targetStyle?: string;
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

  const completeChallengeAction = useCallback(async (challengeId: string) => {
    await apiRequest("POST", `/api/challenges/${challengeId}/complete`);
    await fetchChallenges();
    queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
  }, [fetchChallenges]);

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
    completeChallenge: completeChallengeAction,
  }), [isLoading, challenges, activeChallengeId, activeChallenge, logs, progress, setActiveChallenge, logActivity, updateLog, deleteLog, refresh, createPersonalChallenge, deleteChallengeAction, completeChallengeAction]);

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
