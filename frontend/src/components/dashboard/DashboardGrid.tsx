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
import type { DashboardCardId, DashboardColumn, Task, LogEntry, ScheduleItem, FailureRecord, MinimizedCard, InfoGatheringResult } from '@/types';
import { DashboardCardRenderer } from './grid/DashboardCardRenderer';
import { DragOverlayRenderer } from './grid/DragOverlayRenderer';

interface DashboardGridProps {
  layout: {
    left: DashboardCardId[];
    right: DashboardCardId[];
  };
  minimizedCards: MinimizedCard[];
  onMinimize?: (cardId: DashboardCardId) => void;
  onDragEnd: (event: DragEndEvent) => void;
  // Card props passed through to child components
  onStartScheduler: () => void;
  onStopScheduler: () => void;
  onRecordTask: (name: string, type: 'private' | 'public') => void;
  schedulerStatus: boolean;
  tasks: Task[];
  schedule: ScheduleItem[];
  onAddSchedule: (task: string, cron?: string, executeAt?: string) => void;
  onDeleteSchedule: (index: number) => void;
  onRunTask: (taskName: string) => void;
  onUploadTask: (taskName: string, type: 'private' | 'public', content: string) => Promise<void>;
  logs: LogEntry[];
  onClearLogs: () => void;
  failures: FailureRecord[];
  onClearFailures: () => void;
  onDismissFailure: (id: string) => void;
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
  onUploadTask,
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
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Common props for all card renderers
  const cardRendererProps = {
    onStartScheduler,
    onStopScheduler,
    onRecordTask,
    schedulerStatus,
    tasks,
    schedule,
    onAddSchedule,
    onDeleteSchedule,
    onRunTask,
    onUploadTask,
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
  };

  const renderCard = (id: DashboardCardId) => (
    <DashboardCardRenderer
      key={id}
      cardId={id}
      onMinimize={onMinimize}
      {...cardRendererProps}
    />
  );

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
          <div className="lg:col-span-4">
            <DroppableColumn
              column="left"
              items={visibleLeft}
              renderCard={renderCard}
            />
          </div>

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
          <DragOverlayRenderer activeId={activeId} {...cardRendererProps} />
        </div>
      </DragOverlay>
    </DndContext>
  );
}
