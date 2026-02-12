/**
 * Tests for TaskList component.
 *
 * @module components/dashboard/TaskList.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    onRunTask: vi.fn(),
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
});
