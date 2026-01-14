/**
 * Example test file for React components
 *
 * This file demonstrates how to write tests for your React components.
 * Replace this with your actual tests as you build out the application.
 *
 * Naming convention:
 * - Place test files next to the component they test
 * - OR place them in a __tests__ directory
 * - Use .test.tsx or .spec.tsx extension
 *
 * Example:
 * - src/components/dashboard/TaskList.tsx
 * - src/components/dashboard/TaskList.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Example: How to test a component
//
// import { TaskList } from './TaskList'
//
// describe('TaskList', () => {
//   const mockTasks = [
//     { name: 'task1', type: 'public' as const },
//     { name: 'task2', type: 'private' as const },
//   ]
//
//   it('renders all tasks', () => {
//     const onRunTask = vi.fn()
//     render(<TaskList tasks={mockTasks} onRunTask={onRunTask} />)
//
//     expect(screen.getByText('task1')).toBeInTheDocument()
//     expect(screen.getByText('task2')).toBeInTheDocument()
//   })
//
//   it('calls onRunTask when a task is clicked', async () => {
//     const user = userEvent.setup()
//     const onRunTask = vi.fn()
//     render(<TaskList tasks={mockTasks} onRunTask={onRunTask} />)
//
//     const taskButton = screen.getByText('task1').closest('div[role="button"]') ?? screen.getByText('task1')
//     await user.click(taskButton)
//
//     expect(onRunTask).toHaveBeenCalledWith('task1')
//   })
//
//   it('filters tasks by search query', async () => {
//     const user = userEvent.setup()
//     render(<TaskList tasks={mockTasks} onRunTask={vi.fn()} />)
//
//     const searchInput = screen.getByPlaceholderText('Search tasks...')
//     await user.type(searchInput, 'task1')
//
//     expect(screen.getByText('task1')).toBeInTheDocument()
//     expect(screen.queryByText('task2')).not.toBeInTheDocument()
//   })
// })

describe('Example test suite', () => {
  it('placeholder test - replace with your actual tests', () => {
    expect(true).toBe(true)
  })

  it('demonstrates async testing', async () => {
    const promise = Promise.resolve('result')
    await expect(promise).resolves.toBe('result')
  })

  it('demonstrates mocking', () => {
    const mockFn = vi.fn()
    mockFn('hello')
    expect(mockFn).toHaveBeenCalledWith('hello')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
