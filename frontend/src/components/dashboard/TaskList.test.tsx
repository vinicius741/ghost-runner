/**
 * Tests for TaskList component.
 *
 * @module components/dashboard/TaskList.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskList } from './TaskList';
import type { Task, TaskSource } from '@shared/types';

describe('TaskList', () => {
  const mockTasks: Task[] = [
    { name: 'test-task-1', type: 'public' },
    { name: 'test-task-2', type: 'private' },
    { name: 'test-task-3', type: 'root' },
  ];

  const defaultTaskSource: TaskSource = {
    name: 'test-task-1',
    type: 'public',
    content: 'module.exports = { run: async () => {} };',
    sourceOrigin: 'writable',
    saveType: 'public',
  };

  const createProps = (overrides: Partial<ComponentProps<typeof TaskList>> = {}) => ({
    tasks: mockTasks,
    runningTasks: new Set<string>(),
    onRunTask: vi.fn(),
    onUploadTask: vi.fn().mockResolvedValue(undefined),
    onLoadTaskSource: vi.fn().mockResolvedValue(defaultTaskSource),
    onSaveTaskSource: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render list of tasks', () => {
    render(<TaskList {...createProps()} />);

    expect(screen.getByText('test-task-1')).toBeInTheDocument();
    expect(screen.getByText('test-task-2')).toBeInTheDocument();
    expect(screen.getByText('test-task-3')).toBeInTheDocument();
  });

  it('should display task type badges', () => {
    render(<TaskList {...createProps()} />);

    // Check for type indicators
    const badges = screen.getAllByText(/public|private|root/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should call onRunTask when task card is clicked', () => {
    const props = createProps();
    render(<TaskList {...props} />);

    // Click on the first task card (the component uses click on the card, not a button)
    const taskCards = screen.getAllByText('test-task-1');
    fireEvent.click(taskCards[0]);

    expect(props.onRunTask).toHaveBeenCalledWith('test-task-1');
  });

  it('should show empty state when no tasks', () => {
    render(<TaskList {...createProps({ tasks: [] })} />);

    // Should show some indication of empty state
    expect(screen.queryByText('test-task-1')).not.toBeInTheDocument();
  });

  it('should show search input for filtering tasks', () => {
    render(<TaskList {...createProps()} />);

    // Search input should be present
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should upload a task with normalized task name', async () => {
    const props = createProps();
    render(<TaskList {...props} />);

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
      expect(props.onUploadTask).toHaveBeenCalledWith(
        'My_Cool_Task',
        'private',
        'module.exports = { run: async () => {} };'
      );
    });
  });

  describe('running tasks state', () => {
    it('should show spinner when task is running', () => {
      render(<TaskList {...createProps({ runningTasks: new Set(['test-task-1']) })} />);

      // Check for the spinner icon (Loader2 with animate-spin)
      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      expect(taskCard).toBeInTheDocument();
      expect(taskCard).toHaveAttribute('aria-disabled', 'true');
    });

    it('should prevent running a task that is already running', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...createProps({ runningTasks: new Set(['test-task-1']), onRunTask })} />);

      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      fireEvent.click(taskCard);

      expect(onRunTask).not.toHaveBeenCalled();
    });

    it('should allow running a task that is not currently running', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...createProps({ runningTasks: new Set(['other-task']), onRunTask })} />);

      // test-task-1 is not in runningTasks, so it should be clickable
      const taskCard = screen.getByRole('button', { name: /run test-task-1/i });
      fireEvent.click(taskCard);

      expect(onRunTask).toHaveBeenCalledWith('test-task-1');
    });

    it('should support keyboard navigation for running tasks', () => {
      const onRunTask = vi.fn();
      render(<TaskList {...createProps({ runningTasks: new Set<string>(), onRunTask })} />);

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
      render(<TaskList {...createProps({ runningTasks: new Set(['test-task-1']), onRunTask })} />);

      const taskCard = screen.getByRole('button', { name: /test-task-1.*running/i });
      expect(taskCard).toHaveAttribute('tabIndex', '-1');

      // Keyboard events should not trigger onRunTask
      fireEvent.keyDown(taskCard, { key: 'Enter' });
      expect(onRunTask).not.toHaveBeenCalled();
    });
  });

  describe('task editor', () => {
    it('opens the editor, loads source, and does not run the task from the edit action', async () => {
      const props = createProps();
      render(<TaskList {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /edit test-task-1/i }));

      await waitFor(() => {
        expect(props.onLoadTaskSource).toHaveBeenCalledWith('test-task-1');
      });

      expect(props.onRunTask).not.toHaveBeenCalled();
      expect(await screen.findByLabelText('Automation source editor')).toHaveValue(defaultTaskSource.content);
    });

    it('saves edited task source and keeps the dialog open after save', async () => {
      const props = createProps();
      render(<TaskList {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /edit test-task-1/i }));
      const editor = await screen.findByLabelText('Automation source editor');

      fireEvent.change(editor, {
        target: { value: 'module.exports = { run: async () => { console.log("changed"); } };' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save script/i }));

      await waitFor(() => {
        expect(props.onSaveTaskSource).toHaveBeenCalledWith(
          'test-task-1',
          'public',
          'module.exports = { run: async () => { console.log("changed"); } };'
        );
      });

      expect(screen.getByText(/saved to public override/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save script/i })).toBeDisabled();
      expect(screen.getByText(/no unsaved changes/i)).toBeInTheDocument();
    });

    it('saves root tasks as public overrides', async () => {
      const rootTaskSource: TaskSource = {
        name: 'test-task-3',
        type: 'root',
        content: 'module.exports = { run: async () => {} };',
        sourceOrigin: 'bundled',
        saveType: 'public',
      };
      const props = createProps({
        onLoadTaskSource: vi.fn().mockResolvedValue(rootTaskSource),
      });
      render(<TaskList {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /edit test-task-3/i }));
      const editor = await screen.findByLabelText('Automation source editor');
      fireEvent.change(editor, {
        target: { value: 'module.exports = { run: async () => { return "root"; } };' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save script/i }));

      await waitFor(() => {
        expect(props.onSaveTaskSource).toHaveBeenCalledWith(
          'test-task-3',
          'public',
          'module.exports = { run: async () => { return "root"; } };'
        );
      });

      expect(screen.getByText(/saved to public override/i)).toBeInTheDocument();
    });

    it('surfaces load errors in the editor dialog', async () => {
      const props = createProps({
        onLoadTaskSource: vi.fn().mockRejectedValue(new Error('Failed to load task source')),
      });
      render(<TaskList {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /edit test-task-1/i }));

      expect(await screen.findByText(/failed to load task source/i)).toBeInTheDocument();
    });

    it('surfaces save errors without closing the editor', async () => {
      const props = createProps({
        onSaveTaskSource: vi.fn().mockRejectedValue(new Error('Save failed')),
      });
      render(<TaskList {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /edit test-task-1/i }));
      const editor = await screen.findByLabelText('Automation source editor');
      fireEvent.change(editor, {
        target: { value: 'module.exports = { run: async () => { throw new Error("oops"); } };' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save script/i }));

      expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Automation source editor')).toBeInTheDocument();
    });
  });
});
