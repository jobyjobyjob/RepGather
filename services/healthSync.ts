import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_ENABLED_KEY = 'healthkit_enabled';

let _healthKit: any = null;
let _loadAttempted = false;

function getHealthKit(): any {
  if (Platform.OS !== 'ios') return null;
  if (_healthKit) return _healthKit;
  if (_loadAttempted) return null;

  _loadAttempted = true;
  try {
    const mod = require('react-native-health');
    _healthKit = mod.default || mod;
    return _healthKit;
  } catch (e) {
    console.warn('[HealthSync] react-native-health not available:', e);
    return null;
  }
}

export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const hk = getHealthKit();
  return hk != null && typeof hk.initHealthKit === 'function';
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

  const hk = getHealthKit();
  if (!hk) {
    throw new Error('react-native-health module not available. This requires a development build — HealthKit does not work in Expo Go.');
  }

  const perms = {
    permissions: {
      read: [
        hk.Constants?.Permissions?.StepCount || 'StepCount',
        hk.Constants?.Permissions?.DistanceWalkingRunning || 'DistanceWalkingRunning',
      ],
      write: [
        hk.Constants?.Permissions?.StepCount || 'StepCount',
      ],
    },
  };

  return new Promise((resolve, reject) => {
    hk.initHealthKit(perms, (error: any) => {
      if (error) {
        console.error('[HealthSync] initHealthKit error:', JSON.stringify(error));
        return reject(new Error(`HealthKit authorization failed: ${error?.message || JSON.stringify(error)}`));
      }

      if (typeof hk.enableBackgroundDelivery === 'function') {
        try {
          hk.enableBackgroundDelivery(
            hk.Constants?.Permissions?.StepCount || 'StepCount',
            hk.Constants?.ObserverFrequencies?.Hourly || 2,
            (bgErr: any) => {
              if (bgErr) {
                console.warn('[HealthSync] Background delivery setup failed (non-critical):', bgErr);
              }
            }
          );
        } catch (bgErr) {
          console.warn('[HealthSync] Background delivery not supported:', bgErr);
        }
      }

      resolve(true);
    });
  });
}

export async function getStepsForDate(date: Date): Promise<number> {
  if (Platform.OS !== 'ios') return 0;
  const hk = getHealthKit();
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
  const hk = getHealthKit();
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
