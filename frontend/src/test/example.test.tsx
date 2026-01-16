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

// Example: How to test a component
//
// import { render, screen } from '@testing-library/react'
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
//     const onRunTask = vi.fn()
//     render(<TaskList tasks={mockTasks} onRunTask={onRunTask} />)
//
//     const taskButton = screen.getByText('task1').closest('div[role="button"]') ?? screen.getByText('task1')
//     // Click handling would go here
//     // For user interactions, you would import: import userEvent from '@testing-library/user-event'
//
//     expect(onRunTask).toHaveBeenCalledWith('task1')
//   })
//
//   it('filters tasks by search query', async () => {
//     render(<TaskList tasks={mockTasks} onRunTask={vi.fn()} />)
//
//     const searchInput = screen.getByPlaceholderText('Search tasks...')
//     // Type interaction would go here
//     // For user interactions, you would import: import userEvent from '@testing-library/user-event'
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
