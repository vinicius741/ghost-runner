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
import type { DashboardCardId, DashboardColumn, Task, LogEntry, ScheduleItem, FailureRecord } from '@/types';

interface DashboardGridProps {
  layout: {
    left: DashboardCardId[];
    right: DashboardCardId[];
  };
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
}: DashboardGridProps) {
  const [activeId, setActiveId] = useState<DashboardCardId | null>(null);

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
    switch (id) {
      case 'controlPanel':
        return (
          <SortableCard key={id} id={id}>
            <ControlPanel
              onStartScheduler={onStartScheduler}
              onStopScheduler={onStopScheduler}
              onRecordTask={onRecordTask}
              schedulerStatus={schedulerStatus}
            />
          </SortableCard>
        );

      case 'nextTaskTimer':
        return (
          <SortableCard key={id} id={id}>
            <NextTaskTimer schedulerRunning={schedulerStatus} />
          </SortableCard>
        );

      case 'scheduleBuilder':
        return (
          <SortableCard key={id} id={id}>
            <ScheduleBuilder
              tasks={tasks}
              schedule={schedule}
              onAddSchedule={onAddSchedule}
              onDeleteSchedule={onDeleteSchedule}
            />
          </SortableCard>
        );

      case 'taskList':
        return (
          <SortableCard key={id} id={id}>
            <TaskList tasks={tasks} onRunTask={onRunTask} />
          </SortableCard>
        );

      case 'logsConsole':
        return (
          <SortableCard key={id} id={id}>
            <LogsConsole logs={logs} onClearLogs={onClearLogs} />
          </SortableCard>
        );

      case 'warningsPanel':
        return (
          <SortableCard key={id} id={id}>
            <WarningsPanel
              failures={failures}
              onClearFailures={onClearFailures}
              onDismissFailure={onDismissFailure}
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
      default:
        return null;
    }
  };

  const allItems = [...layout.left, ...layout.right];

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
              items={layout.left}
              renderCard={renderCard}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8">
            <DroppableColumn
              column="right"
              items={layout.right}
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
