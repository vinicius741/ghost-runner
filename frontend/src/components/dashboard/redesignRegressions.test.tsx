/**
 * Regression tests for issues found in review of the UI redesign.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { classifySocketLog } from '@/contexts/useDashboardLogs';
import { getNextRun } from '@/lib/schedule';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { ScheduleList } from './schedule-builder/ScheduleList';
import type { ScheduleItem } from './schedule-builder/types';

vi.mock('@/contexts/dashboardSocket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));

describe('classifySocketLog', () => {
  it('marks server error and crash lines as errors', () => {
    expect(classifySocketLog('[Scheduler ERROR] boom')).toBe('error');
    expect(classifySocketLog('[Task: fetch_weather ERROR] boom')).toBe('error');
    expect(classifySocketLog('[Task: x SYSTEM ERROR] Failed to spawn process')).toBe('error');
    expect(classifySocketLog('[SYSTEM CRASH] Uncaught Exception: x')).toBe('error');
  });

  it('marks system and scheduler status lines as system', () => {
    expect(classifySocketLog('[System] Global settings updated via UI.')).toBe('system');
    expect(classifySocketLog('[Scheduler] Stopped.')).toBe('system');
  });

  it('leaves ordinary task output as normal', () => {
    expect(classifySocketLog('[Task: x] Navigating to page')).toBe('normal');
    expect(classifySocketLog('An ERROR word mid-line is not a marker')).toBe('normal');
  });
});

describe('getNextRun', () => {
  it('returns null for a one-time run that is already in the past', () => {
    const from = new Date('2026-01-01T12:00:00Z');
    expect(getNextRun({ task: 't', executeAt: '2026-01-01T11:00:00Z' }, from)).toBeNull();
    expect(getNextRun({ task: 't', executeAt: '2026-01-01T13:00:00Z' }, from)?.toISOString()).toBe(
      '2026-01-01T13:00:00.000Z'
    );
  });

  it('computes the next cron occurrence after the given time', () => {
    const from = new Date(2026, 0, 1, 10, 5);
    expect(getNextRun({ task: 't', cron: '*/30 * * * *' }, from)).toEqual(new Date(2026, 0, 1, 10, 30));
  });
});

describe('ScheduleList deletion', () => {
  it('deletes the confirmed entry even if the list changed while confirming', () => {
    const onDelete = vi.fn();
    const a: ScheduleItem = { task: 'a', cron: '0 1 * * *' };
    const b: ScheduleItem = { task: 'b', cron: '0 2 * * *' };
    const c: ScheduleItem = { task: 'c', cron: '0 3 * * *' };
    const { rerender } = render(<ScheduleList schedule={[a, b, c]} onDeleteSchedule={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete schedule for b' }));
    // "a" disappears (e.g. completed) while the dialog is open.
    rerender(<ScheduleList schedule={[b, c]} onDeleteSchedule={onDelete} />);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it('does nothing if the confirmed entry no longer exists', () => {
    const onDelete = vi.fn();
    const a: ScheduleItem = { task: 'a', cron: '0 1 * * *' };
    const b: ScheduleItem = { task: 'b', cron: '0 2 * * *' };
    const { rerender } = render(<ScheduleList schedule={[a, b]} onDeleteSchedule={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete schedule for b' }));
    rerender(<ScheduleList schedule={[a]} onDeleteSchedule={onDelete} />);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl keyboard', () => {
  function Harness() {
    const [value, setValue] = useState<'one' | 'two' | 'three'>('one');
    return (
      <SegmentedControl
        ariaLabel="Pick"
        value={value}
        onChange={setValue}
        options={[
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two' },
          { value: 'three', label: 'Three' },
        ]}
      />
    );
  }

  it('has a single tab stop and moves selection with arrows, Home and End', () => {
    render(<Harness />);
    const [one, two, three] = screen.getAllByRole('radio');
    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(one, { key: 'ArrowRight' });
    expect(two).toHaveAttribute('aria-checked', 'true');
    expect(two).toHaveFocus();

    fireEvent.keyDown(two, { key: 'End' });
    expect(three).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(three, { key: 'ArrowRight' });
    expect(one).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(one, { key: 'ArrowLeft' });
    expect(three).toHaveAttribute('aria-checked', 'true');
  });
});

describe('TaskList row structure', () => {
  it('does not nest the Edit button inside the run role="button"', async () => {
    const { TaskList } = await import('./TaskList');
    render(
      <TaskList
        tasks={[{ name: 'demo', type: 'public' }]}
        runningTasks={new Set()}
        onRunTask={vi.fn()}
        onUploadTask={vi.fn()}
        onLoadTaskSource={vi.fn()}
        onSaveTaskSource={vi.fn()}
      />
    );
    const runTarget = screen.getByRole('button', { name: 'Run demo' });
    expect(within(runTarget).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit demo' })).toBeInTheDocument();
  });
});
