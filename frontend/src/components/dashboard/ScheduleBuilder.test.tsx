import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./schedule-builder', async () => {
  const actual = await vi.importActual<typeof import('./schedule-builder')>('./schedule-builder');

  return {
    ...actual,
    TaskSelector: ({
      tasks,
      selectedTask,
      onTaskChange,
    }: {
      tasks: Array<{ name: string }>;
      selectedTask: string;
      onTaskChange: (task: string) => void;
    }) => (
      <select
        aria-label="Select Automation"
        data-testid="task-selector"
        value={selectedTask}
        onChange={(event) => onTaskChange(event.target.value)}
      >
        <option value="">Choose a task...</option>
        {tasks.map((task) => (
          <option key={task.name} value={task.name}>
            {task.name}
          </option>
        ))}
      </select>
    ),
  };
});

import { ScheduleBuilder, normalizeOnceDelay } from './ScheduleBuilder';
import type { Task } from './schedule-builder';

const TASKS: Task[] = [
  { name: 'sample_task', type: 'public' },
];

function renderScheduleBuilder(overrides?: Partial<ComponentProps<typeof ScheduleBuilder>>) {
  const props: ComponentProps<typeof ScheduleBuilder> = {
    tasks: TASKS,
    schedule: [],
    onAddSchedule: vi.fn(),
    onDeleteSchedule: vi.fn(),
    ...overrides,
  };

  const view = render(<ScheduleBuilder {...props} />);
  return { ...view, props };
}

describe('normalizeOnceDelay', () => {
  it('carries minute overflow into hours', () => {
    expect(normalizeOnceDelay(1, 120)).toEqual({ delayHours: 3, delayMinutes: 0 });
    expect(normalizeOnceDelay(2, 61)).toEqual({ delayHours: 3, delayMinutes: 1 });
    expect(normalizeOnceDelay(0, 59)).toEqual({ delayHours: 0, delayMinutes: 59 });
  });

  it('clamps invalid values to zero and truncates decimals', () => {
    expect(normalizeOnceDelay(-1, -20)).toEqual({ delayHours: 0, delayMinutes: 0 });
    expect(normalizeOnceDelay(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ delayHours: 0, delayMinutes: 0 });
    expect(normalizeOnceDelay(1.9, 61.8)).toEqual({ delayHours: 2, delayMinutes: 1 });
  });
});

describe('ScheduleBuilder once tab', () => {
  it('immediately converts minute overflow into hours in the UI', async () => {
    const user = userEvent.setup();
    renderScheduleBuilder();

    const hoursInput = screen.getByPlaceholderText('HH') as HTMLInputElement;
    const minutesInput = screen.getByPlaceholderText('MM') as HTMLInputElement;

    await user.clear(hoursInput);
    await user.type(hoursInput, '0');
    await user.clear(minutesInput);
    await user.type(minutesInput, '120');

    expect(hoursInput).toHaveValue(2);
    expect(minutesInput).toHaveValue(0);
  });

  it('normalizes one-time delay values before computing executeAt on add', async () => {
    const user = userEvent.setup();
    const onAddSchedule = vi.fn();
    renderScheduleBuilder({ onAddSchedule });

    await user.selectOptions(screen.getByTestId('task-selector'), 'sample_task');

    const hoursInput = screen.getByPlaceholderText('HH') as HTMLInputElement;
    const minutesInput = screen.getByPlaceholderText('MM') as HTMLInputElement;
    const addButton = screen.getByRole('button', { name: /add to schedule/i });

    fireEvent.change(hoursInput, { target: { value: '0' } });
    fireEvent.change(minutesInput, { target: { value: '-10' } });

    expect(hoursInput).toHaveValue(0);
    expect(minutesInput).toHaveValue(0);

    await waitFor(() => expect(addButton).toBeEnabled());
    const beforeClick = Date.now();
    await user.click(addButton);

    expect(onAddSchedule).toHaveBeenCalledTimes(1);
    expect(onAddSchedule).toHaveBeenCalledWith('sample_task', undefined, expect.any(String));

    const executeAt = onAddSchedule.mock.calls[0]?.[2];
    expect(typeof executeAt).toBe('string');

    const executeAtMs = new Date(executeAt as string).getTime();
    expect(executeAtMs).toBeGreaterThanOrEqual(beforeClick - 1000);
    expect(executeAtMs).toBeLessThanOrEqual(beforeClick + 60_000);
  });
});
