# TypeScript `any` Type Audit

This document catalogs all occurrences of the `any` type in the codebase (excluding LICENSE and package-lock.json).

**Total Count:** 51 occurrences of `any` in source files
**Remaining:** 47 occurrences (after fixing Priority 1)

---

## Summary by File

| File | Count | Priority | Status |
|------|-------|----------|--------|
| `src/core/pageWrapper.ts` | 40 | High | Pending |
| `src/server/controllers/scheduler.ts` | 2 | Low | ✅ Completed |
| `src/server/controllers/tasks.ts` | 1 | Low | ✅ Completed |
| `src/server/controllers/logs.ts` | 1 | Low | ✅ Completed |
| `frontend/src/components/dashboard/SettingsManager.tsx` | 2 | Low | N/A (HTML attributes) |
| `src/core/scheduler.ts` | 1 | N/A | N/A (comment) |
| `frontend/package-lock.json` | 4 | N/A | N/A (dependencies) |

---

## 1. `src/core/pageWrapper.ts` (40 occurrences)

This file is a **wrapper around Playwright's Page API**. Most `any` types here are intentional forwarders to the underlying Playwright API.

### Line 75 - `waitForSelector` return type
```typescript
async waitForSelector(
  selector: string,
  options?: { timeout?: number }
): Promise<any> {
```
**Reason:** Forwards to `Page.waitForSelector()` which returns `Promise<ElementHandle>`.
**Fix:** Should return `Promise<null | ElementHandle>`

### Line 93 - `goto` options parameter
```typescript
async goto(url: string, options?: any): Promise<any> {
```
**Reason:** Forwards to `Page.goto()`.
**Fix:** Use `GotoOptions` from Playwright: `import type { GotoOptions } from 'playwright'`

### Line 128 - `waitForNavigation` options parameter
```typescript
async waitForNavigation(options?: any): Promise<any> {
```
**Reason:** Forwards to `Page.waitForNavigation()`.
**Fix:** Use `WaitForNavigationOptions` from Playwright

### Line 187-188 - `getByRole` role parameter
```typescript
getByRole(role: string, options?: any): ReturnType<Page['getByRole']> {
  return this.page.getByRole(role as any, options);
```
**Reason:** Playwright expects `AriaRole` enum, but wrapper takes `string`.
**Fix:** Import `AriaRole` type from Playwright and use proper type assertion

### Lines 191-365 - Various method options parameters (32 occurrences)
All methods like `click`, `fill`, `type`, `press`, `check`, `uncheck`, `hover`, `focus`, `tap`, `screenshot`, `pdf`, `reload`, `goBack`, `goForward`, `setContent`, `emulateMedia` use `options?: any`.
**Reason:** All forwarders to Playwright Page methods.
**Fix:** Use proper Playwright option types for each method

### Line 207 - `selectOption` value parameter
```typescript
selectOption(selector: string, value: any, options?: any): ReturnType<Page['selectOption']> {
```
**Reason:** Playwright accepts multiple value types.
**Fix:** Use proper union type from Playwright

### Line 264 - `evaluate` function cast
```typescript
evaluate<R, Arg>(pageFunction: (arg: Arg) => R, arg?: Arg): ReturnType<Page['evaluate']> {
  return this.page.evaluate(pageFunction as any, arg);
```
**Reason:** Type mismatch between wrapper signature and Playwright's.
**Fix:** Align function signature with Playwright's `Page.evaluate`

### Line 268 - `evaluateHandle` function cast
```typescript
evaluateHandle<R, Arg>(pageFunction: (arg: Arg) => R, arg?: Arg): ReturnType<Page['evaluateHandle']> {
  return this.page.evaluateHandle(pageFunction as any, arg);
```
**Reason:** Similar to `evaluate`.
**Fix:** Align signature with Playwright

### Lines 271, 275 - `$eval` and `$$eval` element parameters
```typescript
$eval<R>(selector: string, pageFunction: (element: any, arg?: any) => R, arg?: any): ReturnType<Page['$eval']> {
$$eval<R>(selector: string, pageFunction: (elements: any[], arg?: any) => R, arg?: any): ReturnType<Page['$$eval']> {
```
**Reason:** Element type in browser context is hard to type.
**Fix:** Use `ElementHandle` from Playwright

### Lines 279, 283 - `addScriptTag` and `addStyleTag` options
```typescript
addScriptTag(options: any): ReturnType<Page['addScriptTag']> {
addStyleTag(options: any): ReturnType<Page['addStyleTag']> {
```
**Reason:** Forwards to Playwright methods.
**Fix:** Use `ScriptTagOptions` and `StyleTagOptions` from Playwright

### Line 288 - `addInitScript` script cast
```typescript
addInitScript(script?: string | { path: string } | ((arg: unknown) => string | Promise<string>), arg?: unknown): ReturnType<Page['addInitScript']> {
  return this.page.addInitScript(script as any, arg);
```
**Reason:** Type cast needed for internal Playwright compatibility.
**Fix:** May be unavoidable without changing signature

### Lines 303-316 - Event handler methods (6 occurrences)
```typescript
on(event: any, listener: (...args: any[]) => void): any {
once(event: any, listener: (...args: any[]) => void): any {
off(event: any, listener: (...args: any[]) => void): any {
removeAllListeners(event?: any): any {
```
**Reason:** EventEmitter pattern with dynamic event types.
**Fix:** Use Playwright's event type unions if available

### Lines 331, 332 - `waitForFunction` function cast and options
```typescript
waitForFunction<R>(pageFunction: () => R | Promise<R>, options?: any): ReturnType<Page['waitForFunction']> {
  return this.page.waitForFunction(pageFunction as any, options);
```
**Reason:** Function evaluation in browser context.
**Fix:** Use proper Playwright types

### Lines 343-345 - `waitForURL` parameters
```typescript
waitForURL(url?: any, options?: any): ReturnType<Page['waitForURL']> {
  return this.page.waitForURL(url, options);
```
**Reason:** URL can be string, RegExp, or function.
**Fix:** Use proper union from Playwright

### Lines 375, 379 - `route` and `unroute` parameters
```typescript
route(url: any, handler: any): any {
unroute(url: any, handler?: any): any {
```
**Reason:** Route handler types are complex.
**Fix:** Use Playwright's `Route` and `Handler` types

---

## 2. `src/server/controllers/scheduler.ts` (2 occurrences) ✅ COMPLETED

### Line 42 - Error catch in `getSchedule`
```typescript
} catch (error: any) {
  if (error.code === 'ENOENT') {
```
**Reason:** Need to access `code` property on fs errors.
**Fix:** ✅ Applied - Using `unknown` with type guard: `error instanceof Object && 'code' in error && error.code === 'ENOENT'`

### Line 98 - Error catch in `getNextTask`
```typescript
} catch (error: any) {
  if (error.code === 'ENOENT') {
```
**Reason:** Same as above.
**Fix:** ✅ Applied - Using `unknown` with type guard

---

## 3. `src/server/controllers/tasks.ts` (1 occurrence) ✅ COMPLETED

### Line 12 - Return type of `parseTaskStatus`
```typescript
function parseTaskStatus(line: string): { status: string; data: any } | null {
```
**Reason:** `data` can be any JSON-parsed object with task-specific fields.
**Fix:** ✅ Applied - Added proper interfaces:
```typescript
export interface TaskStatusData {
  taskName?: string;
  timestamp?: string;
  errorType?: string;
  errorMessage?: string;
  errorContext?: Record<string, unknown>;
}

export interface ParsedTaskStatus {
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  data: TaskStatusData;
}

function parseTaskStatus(line: string): ParsedTaskStatus | null
```
Also added `isValidTaskStatus()` type guard for runtime validation.

---

## 4. `src/server/controllers/logs.ts` (1 occurrence) ✅ COMPLETED

### Line 9 - Error catch in `getLogs`
```typescript
} catch (error: any) {
  if (error.code === 'ENOENT') {
```
**Reason:** Same as scheduler.ts - need `code` property.
**Fix:** ✅ Applied - Using `unknown` with type guard

---

## 5. `frontend/src/components/dashboard/SettingsManager.tsx` (2 occurrences)

### Lines 191, 203 - Input step attribute
```typescript
<Input ... step="any" />
```
**Reason:** HTML attribute value for number input - allows decimal values.
**Fix:** This is actually **correct** - `"any"` is a valid HTML string value for the `step` attribute. This is **not** a TypeScript `any` type, but a string literal. These should be **excluded** from this audit.

---

## 6. `src/core/scheduler.ts` (1 occurrence)

### Line 67 - Comment only
```typescript
* Checks if there are any tasks left to be executed.
```
**Reason:** English word in comment, not TypeScript code.
**Fix:** N/A - ignore

---

## Recommended Fix Order

### ✅ Priority 1: High Impact / Low Effort (COMPLETED)
1. ~~**Controller error handlers** (scheduler.ts, logs.ts) - Replace `error: any` with `unknown` and type guards~~ ✅
2. ~~**Task status data** (tasks.ts) - Define proper `TaskStatusData` interface~~ ✅

### Priority 2: High Value / Moderate Effort (NEXT)
3. **pageWrapper.ts return types** - Fix `waitForSelector`, `goto`, `waitForNavigation` return types
4. **pageWrapper.ts core options** - Add `GotoOptions`, `WaitForNavigationOptions` imports

### Priority 3: Lower Priority (Type Safety Forwarders)
5. **pageWrapper.ts Playwright forwarders** - The remaining ~30 `any` types are mostly forwarding to Playwright's API. While they could be typed, they don't pose significant risk since they preserve Playwright's signatures.

### Priority 4: Not Actual Issues
6. **SettingsManager.tsx** - The `step="any"` values are HTML string attributes, not TypeScript types

---

## Fix Template: Error Handler Pattern

Replace all controller error handlers with this pattern:

```typescript
// Before
} catch (error: any) {
  if (error.code === 'ENOENT') {

// After
} catch (error) {
  if (error instanceof Object && 'code' in error && error.code === 'ENOENT') {
```

Or use a utility type guard:

```typescript
function isFileSystemError(error: unknown): error is { code: string } {
  return error instanceof Object && 'code' in error;
}

// Usage
} catch (error) {
  if (isFileSystemError(error) && error.code === 'ENOENT') {
```
