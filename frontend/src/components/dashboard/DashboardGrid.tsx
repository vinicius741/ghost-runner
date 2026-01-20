import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import { ControlPanel } from './ControlPanel';
import { NextTaskTimer } from './NextTaskTimer';
import { ScheduleBuilder } from './ScheduleBuilder';
import { TaskList } from './TaskList';
import { LogsConsole } from './LogsConsole';
import { WarningsPanel } from './WarningsPanel';
import { InfoGathering } from './InfoGathering';
import type { DashboardCardId, DashboardColumn, Task, LogEntry, ScheduleItem, FailureRecord, MinimizedCard, InfoGatheringResult } from '@/types';
import { CARD_METADATA } from '@/types';

interface DashboardGridProps {
  layout: {
    left: DashboardCardId[];
    right: DashboardCardId[];
  };
  minimizedCards: MinimizedCard[];
  onMinimize?: (cardId: DashboardCardId) => void;
  onDragEnd: (event: DragEndEvent) => void;
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

interface DroppableColumnProps {
  column: DashboardColumn;
  items: DashboardCardId[];
  renderCard: (id: DashboardCardId) => React.ReactNode;
}

function DroppableColumn({ column, items, renderCard }: DroppableColumnProps) {
  return (
    <SortableContext
      id={column}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col gap-8">
        {items.map((id) => renderCard(id))}
      </div>
    </SortableContext>
  );
}

export function DashboardGrid({
  layout,
  minimizedCards,
  onMinimize,
  onDragEnd,
  onStartScheduler,
  onStopScheduler,
  onRecordTask,
  schedulerStatus,
  tasks,
  schedule,
  onAddSchedule,
  onDeleteSchedule,
  onRunTask,
  logs,
  onClearLogs,
  failures,
  onClearFailures,
  onDismissFailure,
  infoGatheringResults,
  onRefreshInfoGatheringTask,
  onClearInfoGatheringResult,
  onClearAllInfoGatheringResults,
  refreshingInfoGatheringTasks,
}: DashboardGridProps) {
  const [activeId, setActiveId] = useState<DashboardCardId | null>(null);

  // Filter out minimized cards from layout
  const minimizedIds = new Set(minimizedCards.map(m => m.id));
  const visibleLeft = layout.left.filter(id => !minimizedIds.has(id));
  const visibleRight = layout.right.filter(id => !minimizedIds.has(id));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const renderCard = (id: DashboardCardId) => {
    const title = CARD_METADATA[id].displayName;

    switch (id) {
      case 'controlPanel':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <ControlPanel
              onStartScheduler={onStartScheduler}
              onStopScheduler={onStopScheduler}
              onRecordTask={onRecordTask}
              schedulerStatus={schedulerStatus}
              onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined}
            />
          </SortableCard>
        );

      case 'nextTaskTimer':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <NextTaskTimer schedulerRunning={schedulerStatus} onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined} />
          </SortableCard>
        );

      case 'scheduleBuilder':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <ScheduleBuilder
              tasks={tasks}
              schedule={schedule}
              onAddSchedule={onAddSchedule}
              onDeleteSchedule={onDeleteSchedule}
              onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined}
            />
          </SortableCard>
        );

      case 'taskList':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <TaskList tasks={tasks} onRunTask={onRunTask} onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined} />
          </SortableCard>
        );

      case 'logsConsole':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <LogsConsole logs={logs} onClearLogs={onClearLogs} onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined} />
          </SortableCard>
        );

      case 'warningsPanel':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <WarningsPanel
              failures={failures}
              onClearFailures={onClearFailures}
              onDismissFailure={onDismissFailure}
              onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined}
            />
          </SortableCard>
        );

      case 'infoGathering':
        return (
          <SortableCard key={id} id={id} onMinimize={onMinimize ? () => onMinimize(id) : undefined} title={title}>
            <InfoGathering
              results={infoGatheringResults}
              onRefreshTask={onRefreshInfoGatheringTask}
              onClearResult={onClearInfoGatheringResult}
              onClearAll={onClearAllInfoGatheringResults}
              onHeaderDoubleClick={onMinimize ? () => onMinimize(id) : undefined}
              refreshingTasks={refreshingInfoGatheringTasks}
            />
          </SortableCard>
        );

      default:
        return null;
    }
  };

  const renderDragOverlay = () => {
    if (!activeId) return null;
    switch (activeId) {
      case 'controlPanel':
        return (
          <ControlPanel
            onStartScheduler={onStartScheduler}
            onStopScheduler={onStopScheduler}
            onRecordTask={onRecordTask}
            schedulerStatus={schedulerStatus}
          />
        );
      case 'nextTaskTimer':
        return <NextTaskTimer schedulerRunning={schedulerStatus} />;
      case 'scheduleBuilder':
        return (
          <ScheduleBuilder
            tasks={tasks}
            schedule={schedule}
            onAddSchedule={onAddSchedule}
            onDeleteSchedule={onDeleteSchedule}
          />
        );
      case 'taskList':
        return <TaskList tasks={tasks} onRunTask={onRunTask} />;
      case 'logsConsole':
        return <LogsConsole logs={logs} onClearLogs={onClearLogs} />;
      case 'warningsPanel':
        return (
          <WarningsPanel
            failures={failures}
            onClearFailures={onClearFailures}
            onDismissFailure={onDismissFailure}
          />
        );
      case 'infoGathering':
        return (
          <InfoGathering
            results={infoGatheringResults}
            onRefreshTask={onRefreshInfoGatheringTask}
            onClearResult={onClearInfoGatheringResult}
            onClearAll={onClearAllInfoGatheringResults}
            refreshingTasks={refreshingInfoGatheringTasks}
          />
        );
      default:
        return null;
    }
  };

  const allItems = [...visibleLeft, ...visibleRight];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id as DashboardCardId)}
      onDragEnd={(event) => {
        setActiveId(null);
        onDragEnd(event);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={allItems}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-4">
            <DroppableColumn
              column="left"
              items={visibleLeft}
              renderCard={renderCard}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8">
            <DroppableColumn
              column="right"
              items={visibleRight}
              renderCard={renderCard}
            />
          </div>
        </div>
      </SortableContext>

      <DragOverlay>
        <div className="shadow-2xl scale-[1.02] opacity-80">
          {renderDragOverlay()}
        </div>
      </DragOverlay>
    </DndContext>
  );
}
