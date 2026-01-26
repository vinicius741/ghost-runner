export interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

export interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

export type CronTab = 'once' | 'minutes' | 'hourly' | 'daily';

export interface ScheduleConfigState {
  // Cron inputs
  minutes: number;
  hourlyMinute: number;
  dailyTime: string;
  // One-time inputs
  delayHours: number;
  delayMinutes: number;
}
