/**
 * Tests for TaskList component.
 *
 * @module components/dashboard/TaskList.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskList } from './TaskList';
import type { Task } from '@shared/types';

describe('TaskList', () => {
  const mockTasks: Task[] = [
    { name: 'test-task-1', type: 'public' },
    { name: 'test-task-2', type: 'private' },
    { name: 'test-task-3', type: 'root' },
  ];

  const defaultProps = {
    tasks: mockTasks,
    runningTasks: new Set<string>(),
    onRunTask: vi.fn(),
    onUploadTask: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render list of tasks', () => {
    render(<TaskList {...defaultProps} />);

    expect(screen.getByText('test-task-1')).toBeInTheDocument();
    expect(screen.getByText('test-task-2')).toBeInTheDocument();
    expect(screen.getByText('test-task-3')).toBeInTheDocument();
  });

  it('should display task type badges', () => {
    render(<TaskList {...defaultProps} />);

    // Check for type indicators
    const badges = screen.getAllByText(/public|private|root/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should call onRunTask when task card is clicked', () => {
    render(<TaskList {...defaultProps} />);

    // Click on the first task card (the component uses click on the card, not a button)
    const taskCards = screen.getAllByText('test-task-1');
    fireEvent.click(taskCards[0]);

    expect(defaultProps.onRunTask).toHaveBeenCalledWith('test-task-1');
  });

  it('should show empty state when no tasks', () => {
    render(<TaskList {...defaultProps} tasks={[]} />);

    // Should show some indication of empty state
    expect(screen.queryByText('test-task-1')).not.toBeInTheDocument();
  });

  it('should show search input for filtering tasks', () => {
    render(<TaskList {...defaultProps} />);

    // Search input should be present
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should upload a task with normalized task name', async () => {
    render(<TaskList {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    const fileInput = screen.getByLabelText('Task File (.js)') as HTMLInputElement;
    const file = new File(['placeholder'], 'My Cool Task.js', {
      type: 'application/javascript',
    });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('module.exports = { run: async () => {} };'),
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload task/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /upload task/i }));

    await waitFor(() => {
      expect(defaultProps.onUploadTask).toHaveBeenCalledWith(
        'My_Cool_Task',
        'private',
        'module.exports = { run: async () => {} };'
      );
    });
  });

  describe('running tasks state', () => {
    it('should show spinner when task is running', () => {
      render(<TaskList {...defaultProps} runningTasks={new Set(['test-task-1'])} />);

      // Check for the spinner icon (Loader2 with animate-spin)
      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      expect(taskCard).toBeInTheDocument();
      expect(taskCard).toHaveAttribute('aria-disabled', 'true');
    });

    it('should prevent running a task that is already running', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...defaultProps} runningTasks={new Set(['test-task-1'])} onRunTask={onRunTask} />);

      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      fireEvent.click(taskCard);

      expect(onRunTask).not.toHaveBeenCalled();
    });

    it('should allow running a task that is not currently running', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...defaultProps} runningTasks={new Set(['other-task'])} onRunTask={onRunTask} />);

      // test-task-1 is not in runningTasks, so it should be clickable
      const taskCard = screen.getByRole('button', { name: /run test-task-1/i });
      fireEvent.click(taskCard);

      expect(onRunTask).toHaveBeenCalledWith('test-task-1');
    });

    it('should support keyboard navigation for running tasks', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...defaultProps} runningTasks={new Set<string>()} onRunTask={onRunTask} />);

      const taskCard = screen.getByRole('button', { name: /run test-task-1/i });
      expect(taskCard).toHaveAttribute('tabIndex', '0');

      // Test Enter key
      fireEvent.keyDown(taskCard, { key: 'Enter' });
      expect(onRunTask).toHaveBeenCalledWith('test-task-1');

      vi.clearAllMocks();

      // Test Space key
      fireEvent.keyDown(taskCard, { key: ' ' });
      expect(onRunTask).toHaveBeenCalledWith('test-task-1');
    });

    it('should not respond to keyboard events when task is running', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...defaultProps} runningTasks={new Set(['test-task-1'])} onRunTask={onRunTask} />);

      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      expect(taskCard).toHaveAttribute('tabIndex', '-1');

      // Keyboard events should not trigger onRunTask
      fireEvent.keyDown(taskCard, { key: 'Enter' });
      expect(onRunTask).not.toHaveBeenCalled();
    });
  });
});
