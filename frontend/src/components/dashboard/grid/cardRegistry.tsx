import React from 'react';
import type { DashboardCardId } from '@/types';
import { ControlPanel } from '../ControlPanel';
import { NextTaskTimer } from '../NextTaskTimer';
import { ScheduleBuilder } from '../ScheduleBuilder';
import { TaskList } from '../TaskList';
import { LogsConsole } from '../LogsConsole';
import { WarningsPanel } from '../WarningsPanel';
import { InfoGathering } from '../InfoGathering';
import type { Task, LogEntry, ScheduleItem, FailureRecord, InfoGatheringResult } from '@/types';

export interface CardProps {
  onHeaderDoubleClick?: () => void;
}

export interface CardRegistryProps {
  // ControlPanel props
  onStartScheduler: () => void;
  onStopScheduler: () => void;
  onRecordTask: (name: string, type: 'private' | 'public') => void;
  schedulerStatus: boolean;
  // ScheduleBuilder props
  tasks: Task[];
  schedule: ScheduleItem[];
  onAddSchedule: (task: string, cron?: string, executeAt?: string) => void;
  onDeleteSchedule: (index: number) => void;
  // TaskList props
  onRunTask: (taskName: string) => void;
  onUploadTask: (taskName: string, type: 'private' | 'public', content: string) => Promise<void>;
  // LogsConsole props
  logs: LogEntry[];
  onClearLogs: () => void;
  // WarningsPanel props
  failures: FailureRecord[];
  onClearFailures: () => void;
  onDismissFailure: (id: string) => void;
  // InfoGathering props
  infoGatheringResults: InfoGatheringResult[];
  onRefreshInfoGatheringTask: (taskName: string) => void;
  onClearInfoGatheringResult: (taskName: string) => void;
  onClearAllInfoGatheringResults: () => void;
  refreshingInfoGatheringTasks: string[];
}

export type CardRenderer = (props: CardRegistryProps & CardProps) => React.ReactElement | null;

export const CARD_RENDERERS: Record<DashboardCardId, CardRenderer> = {
  controlPanel: (props) => (
    <ControlPanel
      onStartScheduler={props.onStartScheduler}
      onStopScheduler={props.onStopScheduler}
      onRecordTask={props.onRecordTask}
      schedulerStatus={props.schedulerStatus}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  nextTaskTimer: (props) => (
    <NextTaskTimer
      schedulerRunning={props.schedulerStatus}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  scheduleBuilder: (props) => (
    <ScheduleBuilder
      tasks={props.tasks}
      schedule={props.schedule}
      onAddSchedule={props.onAddSchedule}
      onDeleteSchedule={props.onDeleteSchedule}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  taskList: (props) => (
    <TaskList
      tasks={props.tasks}
      onRunTask={props.onRunTask}
      onUploadTask={props.onUploadTask}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  logsConsole: (props) => (
    <LogsConsole
      logs={props.logs}
      onClearLogs={props.onClearLogs}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  warningsPanel: (props) => (
    <WarningsPanel
      failures={props.failures}
      onClearFailures={props.onClearFailures}
      onDismissFailure={props.onDismissFailure}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
    />
  ),

  infoGathering: (props) => (
    <InfoGathering
      results={props.infoGatheringResults}
      onRefreshTask={props.onRefreshInfoGatheringTask}
      onClearResult={props.onClearInfoGatheringResult}
      onClearAll={props.onClearAllInfoGatheringResults}
      onHeaderDoubleClick={props.onHeaderDoubleClick}
      refreshingTasks={props.refreshingInfoGatheringTasks}
    />
  ),
};
