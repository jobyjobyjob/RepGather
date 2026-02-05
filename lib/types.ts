export interface PushupGoal {
  id: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  date: string;
  count: number;
  createdAt: string;
}

export interface ReminderSettings {
  enabled: boolean;
  times: string[];
}

export interface AppData {
  goal: PushupGoal | null;
  logs: DailyLog[];
  reminderSettings: ReminderSettings;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
