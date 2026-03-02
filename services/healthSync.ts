import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_ENABLED_KEY = 'healthkit_enabled';

let AppleHealthKit: any = null;
let HealthConstants: any = null;

function loadHealthKit() {
  if (Platform.OS !== 'ios') return null;
  if (AppleHealthKit) return AppleHealthKit;
  try {
    const mod = require('react-native-health');
    AppleHealthKit = mod.default || mod;
    HealthConstants = AppleHealthKit.Constants;
    return AppleHealthKit;
  } catch (e) {
    console.warn('react-native-health not available:', e);
    return null;
  }
}

function getPermissions() {
  const hk = loadHealthKit();
  if (!hk || !HealthConstants) {
    return {
      permissions: {
        read: [],
        write: [],
      },
    };
  }
  return {
    permissions: {
      read: [
        HealthConstants.Permissions.Steps,
        HealthConstants.Permissions.DistanceWalkingRunning,
      ],
      write: [
        HealthConstants.Permissions.Steps,
      ],
    },
  };
}

export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const hk = loadHealthKit();
  if (!hk) return false;
  return typeof hk.initHealthKit === 'function';
}

export async function getHealthSyncEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(HEALTH_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setHealthSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HEALTH_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function initHealthSync(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const hk = loadHealthKit();
  if (!hk) throw new Error('react-native-health module not available');

  const perms = getPermissions();

  return new Promise((resolve, reject) => {
    hk.initHealthKit(perms, (error: any) => {
      if (error) {
        console.error('HealthKit init error:', error);
        return reject(error);
      }
      resolve(true);
    });
  });
}

export async function getStepsForDate(date: Date): Promise<number> {
  if (Platform.OS !== 'ios') return 0;
  const hk = loadHealthKit();
  if (!hk) return 0;

  return new Promise((resolve, reject) => {
    const options = {
      date: date.toISOString(),
      includeManuallyAdded: true,
    };
    hk.getStepCount(options, (err: any, results: any) => {
      if (err) return reject(err);
      resolve(Math.floor(results?.value || 0));
    });
  });
}

export async function getStepsForToday(): Promise<number> {
  return getStepsForDate(new Date());
}

export async function getStepsForDateRange(
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; count: number }>> {
  if (Platform.OS !== 'ios') return [];
  const hk = loadHealthKit();
  if (!hk) return [];

  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period: 1440,
    };
    hk.getDailyStepCountSamples(options, (err: any, results: any) => {
      if (err) return reject(err);
      const data = (results || []).map((r: any) => ({
        date: r.startDate.split('T')[0],
        count: Math.floor(r.value || 0),
      }));
      resolve(data);
    });
  });
}

export const HEALTHKIT_EXERCISE_TYPES = ['Walking (steps)', 'Running (miles)'] as const;

export function isHealthKitExercise(exerciseType: string): boolean {
  return exerciseType === 'Walking (steps)' || exerciseType === 'Running (miles)';
}
