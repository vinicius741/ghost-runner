# Testing Guide

This guide explains how to add and run tests for the Ghost Runner project.

## Overview

The project uses different testing frameworks for frontend and backend:

- **Frontend**: Vitest + React Testing Library
- **Backend**: Node.js built-in test runner (`node:test`) + Supertest

## Frontend Testing

### Running Tests

```bash
cd frontend

# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Adding a New Test

1. Create a test file next to the component you want to test:
   ```
   frontend/src/components/dashboard/TaskList.tsx
   frontend/src/components/dashboard/TaskList.test.tsx
   ```

2. Use this template:

   ```tsx
   import { describe, it, expect, vi } from 'vitest'
   import { render, screen, waitFor } from '@testing-library/react'
   import userEvent from '@testing-library/user-event'
   import { YourComponent } from './YourComponent'

   describe('YourComponent', () => {
     it('renders correctly', () => {
       render(<YourComponent />)
       expect(screen.getByText('something')).toBeInTheDocument()
     })

     it('handles user interaction', async () => {
       const user = userEvent.setup()
       const mockFn = vi.fn()
       render(<YourComponent onAction={mockFn} />)

       await user.click(screen.getByRole('button'))
       expect(mockFn).toHaveBeenCalled()
     })
   })
   ```

### Testing Library Cheatsheet

| Query | Usage |
|-------|-------|
| `getByText()` | Find by text content |
| `getByRole()` | Find by ARIA role (button, etc.) |
| `getByPlaceholderText()` | Find by placeholder |
| `getByLabelText()` | Find by associated label |
| `queryByText()` | Returns null if not found |
| `findByText()` | Wait for element to appear |

## Backend Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Adding a New Test

1. For unit tests, create a file in `test/unit/`:
   ```
   test/unit/scheduler.test.js
   ```

2. For integration tests, create a file in `test/integration/`:
   ```
   test/integration/tasks-api.test.js
   ```

3. Use this template for unit tests:

   ```js
   import { describe, it, mock } from 'node:test';
   import assert from 'node:assert';
   import { yourFunction } from '../src/server/utils/your-file.js';

   describe('yourFunction', () => {
     it('should do something', () => {
       const result = yourFunction('input');
       assert.strictEqual(result, 'expected');
     });
   });
   ```

4. Use this template for integration tests:

   ```js
   import { describe, it, before, after } from 'node:test';
   import assert from 'node:assert';
   import request from 'supertest';
   import { createTestApp } from '../fixtures/server.js';

   describe('API endpoint', () => {
     let app;
     let server;

     before(async () => {
       const testApp = createTestApp();
       app = testApp.app;
       server = testApp.server;
     });

     after(async () => {
       if (server) {
         await new Promise((resolve) => server.close(resolve));
       }
     });

     it('should return expected data', async () => {
       const response = await request(app)
         .get('/api/endpoint')
         .expect('Content-Type', /json/)
         .expect(200);

       assert.ok(Array.isArray(response.body));
     });
   });
   ```

### Node Test Runner Cheatsheet

| Assertion | Usage |
|-----------|-------|
| `assert.strictEqual(a, b)` | Strict equality |
| `assert.deepStrictEqual(a, b)` | Deep equality |
| `assert.ok(value)` | Truthy value |
| `assert.throws(fn)` | Function throws |
| `assert.rejects(asyncFn)` | Promise rejects |
| `mock.fn()` | Create a mock function |
| `t.mock.module()` | Mock a module |

## Test Organization

```
├── frontend/
│   └── src/
│       ├── components/
│       │   └── dashboard/
│       │       ├── TaskList.tsx
│       │       └── TaskList.test.tsx    <-- Place tests next to components
│       └── test/
│           └── setup.ts                 <-- Test setup (globals, mocks)
└── test/
    ├── unit/                            <-- Unit tests for individual functions
    │   └── example-unit.test.js
    ├── integration/                     <-- Integration tests for APIs
    │   └── example-integration.test.js
    └── fixtures/                        <-- Test utilities and fixtures
        └── server.js
```

## Tips for Writing Tests

1. **Test behavior, not implementation** - Test what the component does, not how it does it
2. **Use descriptive test names** - `should show error when email is invalid`
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - Don't make real API calls in tests
5. **Keep tests simple** - One assertion per test is ideal
6. **Use page objects** - For Playwright tests, create reusable page objects
