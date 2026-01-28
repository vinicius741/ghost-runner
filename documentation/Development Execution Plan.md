# Development Execution Plan

> **Document Purpose**: A practical, actionable development plan to execute the Maintenance & Architecture Improvement Plan. Each task includes clear deliverables and checkboxes for tracking progress.
>
> **Note**: For task status tracking to avoid merge conflicts, consider using an external tool (GitHub Projects, Linear, Notion) while keeping this document as the reference plan.

---

## Overview

This document transforms architectural recommendations into concrete development tasks organized by phases. Each phase builds upon the previous one, minimizing risk while progressively improving code quality.

**Success Metrics Tracking:**

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Files > 300 lines | 5 | 0 | [ ] |
| Files > 200 lines | 8 | 2 | [ ] |
| Functions > 50 lines | ~15 | < 5 | [ ] |
| Test Coverage | Unknown | > 70% | [ ] |
| Circular Dependencies | Unknown | 0 | [ ] |

---

## Task Parallelization & Dependency Guide

This section identifies which tasks can be executed in parallel, which have dependencies requiring sequential execution, and potential conflict zones to avoid when multiple developers work simultaneously.

### Parallel Work Streams

The following **work streams** can progress independently. Each stream can be assigned to different developers working concurrently.

#### Stream A: Frontend Foundation (Phase 1)
**Can start immediately**
- Tasks 1.1.3 (API types), 1.2.1 (formatters), 1.2.2 (styleHelpers)
- Tasks 1.3.1 (useApi), 1.3.2 (useSocket), 1.3.4 (useFailureFilters)
- Tasks 1.4.1 (App.tsx error handling - partial)

**Dependencies:** None
**Conflicts:** Coordinate with Stream B on type changes

#### Stream B: Backend Foundation (Phase 1)
**Can start immediately**
- Tasks 1.1.1 (task.types.ts), 1.1.2 (page.types.ts)
- Tasks 1.2.3 (taskValidators), 1.2.4 (taskParser)
- Tasks 1.4.2 (browserConfig error handling), 1.4.3 (scheduler error handling)

**Dependencies:** None
**Conflicts:** Coordinate with Stream A on shared types

#### Stream C: Frontend Components (Phase 2)
**Can start after Stream A completes 1.2.x and 1.3.x**
- Tasks 2.2.x (WarningsPanel extraction)
- Tasks 2.3.x (SettingsManager extraction)

**Dependencies:**
- Requires: 1.2.1, 1.2.2, 1.3.4, 1.3.5
**Conflicts:** None - isolated to dashboard components

#### Stream D: Backend Services (Phase 2)
**Can start after Stream B completes 1.1.x and 1.2.x**
- Tasks 2.1.x (Service layer creation)
- Tasks 2.4.x (Scheduler refactoring)

**Dependencies:**
- Requires: 1.1.1, 1.2.3, 1.2.4
**Conflicts:**
- Coordinate on file system utilities
- Share test fixtures with Stream E

#### Stream E: Core Module Refactoring (Phase 3)
**Can start after Phase 2 complete**
- Tasks 3.2.x (PageWrapper adapters)
- Tasks 3.3.x (BrowserConfig separation)

**Dependencies:**
- Requires: Phase 2 completion
- Task 3.3.x requires 1.4.2 completion
**Conflicts:**
- High - these modify core infrastructure
- **Recommendation:** Complete sequentially, not in parallel

#### Stream F: State Management (Phase 3)
**Can start after Stream C completes**
- Tasks 3.1.x (Context providers)
- Tasks 3.4.x (Dependency injection)

**Dependencies:**
- Requires: 2.2.x, 2.3.x (component extraction)
**Conflicts:**
- Moderate - many files will import new contexts
- Coordinate API client changes with Stream D

#### Stream G: Testing & Performance (Phase 4)
**Can start after Phase 2 complete, parallel with Phase 3**
- Tasks 4.2.x (Test coverage)
- Tasks 4.3.x (Type safety)

**Dependencies:**
- Requires: Services from 2.1.x for testing
**Conflicts:**
- Low - tests can be added independently
- May need updates as Phase 3 changes APIs

---

### Task Dependencies (Must Be Sequential)

The following tasks **must** be completed in order due to direct dependencies:

| Task | Must Complete Before | Reason |
|------|---------------------|--------|
| 1.1.1 (task.types.ts) | 2.1.1, 2.1.2, 2.1.3 | Services need types |
| 1.1.2 (page.types.ts) | 3.2.1 | Adapters need types |
| 1.1.3 (api.types.ts) | 1.3.1, 3.1.8 | Hooks and API client need types |
| 1.2.1 (formatters.ts) | 2.2.2 | FailureCard uses formatters |
| 1.2.2 (styleHelpers.ts) | 2.2.2, 1.3.5 | FailureCard and useFailureStyles need these |
| 1.2.3 (taskValidators.ts) | 2.1.3, 2.4.3 | TaskRunner and TaskValidator need validators |
| 1.2.4 (taskParser.ts) | 2.1.3 | TaskRunner needs parsers |
| 1.3.4 (useFailureFilters.ts) | 2.2.5 | WarningsPanel uses this hook |
| 1.3.5 (useFailureStyles.ts) | 2.2.2 | FailureCard may use this |
| 2.1.1 (FailureRepository) | 2.1.4, 2.1.6 | TaskExecutionService and failures controller need repository |
| 2.1.2 (TaskRepository) | 2.1.4 | TaskExecutionService needs repository |
| 2.1.3 (TaskRunner) | 2.1.4 | TaskExecutionService needs runner |
| 2.2.1-2.2.4 | 2.2.5 | Components must exist before refactoring container |
| 2.3.2-2.3.8 | 2.3.9 | Sections must exist before composing |
| 3.1.2-3.1.6 (Contexts) | 3.1.7 | Providers compose contexts |
| 3.1.7 (AppProviders) | 3.1.9 | App.tsx uses providers |
| 3.1.8 (ApiClient) | 3.1.9 | App.tsx uses API client |
| 3.2.2-3.2.5 (Adapters) | 3.2.6 | MonitoredPage composes adapters |
| 3.2.6 (MonitoredPage) | 3.2.7 | Index exports MonitoredPage |
| 3.3.2-3.3.10 | 3.3.11 | Index composes modules |
| 3.3.11 (config index) | 3.3.12 | Migration uses new structure |

---

### High-Risk Conflict Zones

These areas require **exclusive access** or tight coordination:

#### Zone 1: Shared Type Definitions
**Files:** `src/types/*.ts`, `frontend/src/types/*.ts`
**Risk:** High
**Mitigation:**
- Assign single owner for type changes
- Use PRs with mandatory reviews
- Announce type changes in team chat

#### Zone 2: App.tsx Refactoring
**Files:** `frontend/src/App.tsx`
**Risk:** Critical
**Mitigation:**
- Complete Phase 1-2 before touching App.tsx
- Single developer ownership
- Feature flags for gradual migration

#### Zone 3: Server Controllers
**Files:** `src/server/controllers/*.ts`
**Risk:** Medium
**Mitigation:**
- Extract services first (parallelizable)
- Controller changes happen last
- Integration tests must pass

#### Zone 4: Core Modules (pageWrapper, browserConfig, scheduler)
**Files:** `src/core/*.ts`, `src/config/*.ts`
**Risk:** High
**Mitigation:**
- Sequential execution only
- Comprehensive tests before changes
- Rollback plan required

#### Zone 5: Package Dependencies
**Files:** `package.json`, `frontend/package.json`
**Risk:** Medium
**Mitigation:**
- Coordinate dependency updates
- Lock file management
- Test after each update

---

### Recommended Team Assignments

#### Option 1: Two Developer Team

**Developer 1 (Frontend Focus):**
- Stream A: Phase 1 frontend tasks (Week 1)
- Stream C: Phase 2 component extraction (Weeks 2-3)
- Stream F: Phase 3 state management (Weeks 4-6)

**Developer 2 (Backend Focus):**
- Stream B: Phase 1 backend tasks (Week 1)
- Stream D: Phase 2 services (Weeks 2-3)
- Stream E: Phase 3 core modules (Weeks 4-6)

**Both Developers:**
- Stream G: Phase 4 testing (Weeks 7-8)
- Phase 5 integration (Week 9)

#### Option 2: Three Developer Team

**Developer 1 (Frontend):**
- Stream A + Stream C
- Assist with Stream F

**Developer 2 (Backend Services):**
- Stream B + Stream D
- Assist with Stream E

**Developer 3 (Core/Infrastructure):**
- Stream E (core modules)
- Stream F (DI setup)
- Stream G (performance testing)

#### Option 3: Four+ Developer Team

Add parallel streams within phases:
- **Stream C1:** WarningsPanel extraction (2.2.x)
- **Stream C2:** SettingsManager extraction (2.3.x)
- **Stream D1:** Service layer (2.1.x)
- **Stream D2:** Scheduler refactor (2.4.x)

---

### Branch Strategy

```
main
├── phase-1/foundation
│   ├── task-1.1.1-task-types (Stream B)
│   ├── task-1.2.1-formatters (Stream A)
│   └── task-1.3.1-use-api (Stream A)
├── phase-2/components
│   ├── warnings-panel-refactor (Stream C1)
│   └── settings-manager-refactor (Stream C2)
├── phase-2/services
│   ├── task-execution-service (Stream D1)
│   └── scheduler-refactor (Stream D2)
├── phase-3/app-refactor
│   └── app-context-migration (Stream F)
├── phase-3/core-refactor
│   ├── pagewrapper-adapters (Stream E)
│   └── browserconfig-modules (Stream E)
└── phase-4/testing
    └── test-coverage (Stream G)
```

**Branch Naming:** `phase-{N}/{stream-name}/{task-description}`
**Merge Strategy:** Merge to phase branches first, then to main after phase completion

---

### Conflict Prevention Checklist

Before starting parallel work:

- [ ] Identify which stream you're in
- [ ] Review dependency graph for your tasks
- [ ] Check if any conflict zones apply
- [ ] Announce your work in team channel
- [ ] Pull latest changes before starting
- [ ] Create feature branch from correct base
- [ ] Run tests before and after changes
- [ ] Update this document when completing tasks

---

### Daily Coordination Protocol

**Morning Standup:**
1. What stream are you working in?
2. Any cross-stream dependencies today?
3. Are you touching any conflict zones?

**End of Day:**
1. Push branch (even if WIP)
2. Update task status in this document
3. Flag any blockers for tomorrow

---

## Phase 1: Foundation & Low-Risk Extractions

**Phase Goal**: Extract utilities, create hooks, and separate type definitions without changing business logic. These changes are low risk and establish patterns for subsequent phases.

**Estimated Duration**: 1-2 weeks (consider adding 20-30% buffer time for unforeseen issues)

**Rollback Strategy**: Each task in this phase can be independently reverted. Keep branches short-lived and merge frequently to minimize rollback scope.

---

### 1.1 Type Definitions & Interfaces

**Objective**: Extract all type definitions into dedicated files for better maintainability and reusability.

- [ ] **Task 1.1.1**: Create `src/types/task.types.ts`
  - [ ] Extract interfaces from `src/server/controllers/tasks.ts` (lines 11-55)
  - [ ] Export `TaskStatus`, `TaskInfo`, `TaskProcess`, `TaskStream` interfaces
  - [ ] Add JSDoc comments for each interface
  - [ ] Deliverable: New file with all task-related types

- [ ] **Task 1.1.2**: Create `src/core/page/types/page.types.ts`
  - [ ] Extract type definitions from `src/core/pageWrapper.ts` (lines 13-41)
  - [ ] Export `ExtendedPage`, `PageMethod`, `PageWrapperOptions`
  - [ ] Deliverable: Dedicated type file for page wrapper

- [ ] **Task 1.1.3**: Create `frontend/src/types/api.types.ts`
  - [ ] Extract API response types from `frontend/src/App.tsx`
  - [ ] Define `Task`, `ScheduleItem`, `Failure`, `LogEntry` interfaces
  - [ ] Deliverable: Centralized API type definitions

- [ ] **Task 1.1.4**: Update imports in source files
  - [ ] Update `tasks.ts` to import from `task.types.ts`
  - [ ] Update `pageWrapper.ts` to import from `page.types.ts`
  - [ ] Update `App.tsx` to import API types from `api.types.ts`
  - [ ] Deliverable: All existing files import from new type locations

---

### 1.2 Utility Function Extractions

**Objective**: Extract pure utility functions from large components into reusable modules.

- [ ] **Task 1.2.1**: Create `frontend/src/utils/formatters.ts`
  - [ ] Extract `formatTimestamp` from `WarningsPanel.tsx`
  - [ ] Extract `formatDuration` from `WarningsPanel.tsx`
  - [ ] Add unit tests for each formatter
  - [ ] Deliverable: Tested formatter utilities

- [ ] **Task 1.2.2**: Create `frontend/src/utils/styleHelpers.ts`
  - [ ] Extract `getErrorColor` function from `WarningsPanel.tsx` (lines 72-112)
  - [ ] Extract `getErrorIcon` function from `WarningsPanel.tsx`
  - [ ] Create comprehensive test suite
  - [ ] Deliverable: Style helper utilities with tests

- [ ] **Task 1.2.3**: Create `src/server/utils/taskValidators.ts`
  - [ ] Extract type guards from `tasks.ts` (lines 11-55)
  - [ ] Extract `isValidTaskName` from `scheduler.ts` (lines 104-108)
  - [ ] Add validation unit tests
  - [ ] Deliverable: Validated utility functions

- [ ] **Task 1.2.4**: Create `src/server/utils/taskParser.ts`
  - [ ] Extract status parsing logic from `tasks.ts` (lines 61-81)
  - [ ] Create pure functions for parsing task output
  - [ ] Add unit tests with sample outputs
  - [ ] Deliverable: Tested parser utilities

---

### 1.3 Custom Hooks Creation

**Objective**: Create reusable hooks to encapsulate API calls and stateful logic.

- [ ] **Task 1.3.1**: Create `frontend/src/hooks/useApi.ts`
  - [ ] Extract fetch logic from `App.tsx` into generic `useApi` hook
  - [ ] Implement loading, error, and data states
  - [ ] Add request cancellation support
  - [ ] Deliverable: Reusable API hook

- [ ] **Task 1.3.2**: Create `frontend/src/hooks/useSocket.ts`
  - [ ] Extract Socket.io connection logic from `App.tsx`
  - [ ] Implement auto-reconnect with exponential backoff
  - [ ] Create typed event handlers
  - [ ] Deliverable: Robust socket connection hook

- [ ] **Task 1.3.3**: Create `frontend/src/hooks/useScheduler.ts`
  - [ ] Extract scheduler operations from `App.tsx`
  - [ ] Implement start, stop, and status methods
  - [ ] Add optimistic updates
  - [ ] Deliverable: Scheduler management hook

- [ ] **Task 1.3.4**: Create `frontend/src/hooks/useFailureFilters.ts`
  - [ ] Extract filtering logic from `WarningsPanel.tsx` (lines 54-67)
  - [ ] Implement filter state management
  - [ ] Add memoized filtered results
  - [ ] Deliverable: Filter management hook

- [ ] **Task 1.3.5**: Create `frontend/src/hooks/useFailureStyles.ts`
  - [ ] Extract style helper usage from `WarningsPanel.tsx`
  - [ ] Create memoized style calculations
  - [ ] Deliverable: Style computation hook

---

### 1.4 Error Handling Improvements

**Objective**: Add proper error handling without changing core logic.

- [ ] **Task 1.4.1**: Fix silent errors in `App.tsx`
  - [ ] Add error boundary wrapper to dashboard
  - [ ] Implement toast notification system for API errors
  - [ ] Update `fetchTasks` error handling (lines 52-54)
  - [ ] Deliverable: Visible error notifications

- [ ] **Task 1.4.2**: Improve `browserConfig.ts` error handling
  - [ ] Implement graceful degradation (lines 100-102)
  - [ ] Add fallback mechanisms for profile loading
  - [ ] Deliverable: Resilient configuration loading

- [ ] **Task 1.4.3**: Fix `scheduler.ts` async error handling
  - [ ] Add try-catch in setTimeout callbacks (lines 227-234)
  - [ ] Implement error logging
  - [ ] Deliverable: Safe async operations

---

### Phase 1 Completion Checkpoint

- [ ] All type definitions extracted and imported correctly
- [ ] Utility functions tested and working
- [ ] Custom hooks functional in at least one component
- [ ] Error handling displays user-friendly messages
- [ ] No regression in existing functionality
- [ ] **Testing Requirements**:
  - [ ] Unit tests written for all extracted utilities (formatters, validators, parsers)
  - [ ] Hook tests cover loading, error, and success states
  - [ ] Integration tests verify type imports work correctly

---

## Phase 2: Component Extraction & Service Layer

**Phase Goal**: Break down large components into smaller pieces and introduce service/repository layers for business logic separation.

**Estimated Duration**: 2-3 weeks (consider adding 20-30% buffer time for unforeseen issues)
**Prerequisite**: Phase 1 complete

**Rollback Strategy**: Service layer changes can be reverted by keeping old controller implementations in commented form during migration. Use feature flags for new component structures.

---

### 2.1 Backend Service Layer

**Objective**: Extract business logic from controllers into dedicated services.

- [ ] **Task 2.1.1**: Create `src/server/repositories/FailureRepository.ts`
  - [ ] Implement `getAll()`, `save()`, `clear()`, `getById()` methods
  - [ ] Abstract file system operations from `failures.ts`
  - [ ] Add error handling and logging
  - [ ] Deliverable: Repository with full test coverage

- [ ] **Task 2.1.2**: Create `src/server/repositories/TaskRepository.ts`
  - [ ] Implement task status reading/writing
  - [ ] Abstract file operations from `tasks.ts`
  - [ ] Deliverable: Task data access layer

- [ ] **Task 2.1.3**: Create `src/server/services/TaskRunner.ts`
  - [ ] Extract child process spawning from `tasks.ts` (lines 130-214)
  - [ ] Implement process lifecycle management
  - [ ] Add process monitoring and cleanup
  - [ ] Deliverable: Isolated task execution service

- [ ] **Task 2.1.4**: Create `src/server/services/TaskExecutionService.ts`
  - [ ] Orchestrate task execution workflow
  - [ ] Coordinate between TaskRepository, FailureRepository, and TaskRunner
  - [ ] Implement execution logging
  - [ ] Deliverable: High-level task execution orchestration

- [ ] **Task 2.1.5**: Refactor `src/server/controllers/tasks.ts`
  - [ ] Replace inline logic with service calls
  - [ ] Reduce controller to thin HTTP layer (~100 lines target)
  - [ ] Update all imports
  - [ ] Deliverable: Clean, thin controller

- [ ] **Task 2.1.6**: Refactor `src/server/controllers/failures.ts`
  - [ ] Use FailureRepository for all data access
  - [ ] Remove direct file system calls
  - [ ] Deliverable: Repository-based controller

---

### 2.2 Frontend Component Extraction - WarningsPanel

**Objective**: Break down `WarningsPanel.tsx` (400 lines) into focused components.

- [ ] **Task 2.2.1**: Create directory structure
  - [ ] Create `frontend/src/components/dashboard/warnings/` directory
  - [ ] Create subdirectories: `components/`, `hooks/`, `utils/`
  - [ ] Deliverable: Organized folder structure

- [ ] **Task 2.2.2**: Create `FailureCard.tsx`
  - [ ] Extract individual failure display from `WarningsPanel.tsx`
  - [ ] Accept failure data via props
  - [ ] Use extracted style helpers
  - [ ] Deliverable: Reusable failure card component

- [ ] **Task 2.2.3**: Create `FailureDetailsDialog.tsx`
  - [ ] Extract modal/dialog implementation (lines 311-396)
  - [ ] Implement controlled component pattern
  - [ ] Add accessibility attributes
  - [ ] Deliverable: Standalone dialog component

- [ ] **Task 2.2.4**: Create `FilterTabs.tsx`
  - [ ] Extract filter UI from `WarningsPanel.tsx`
  - [ ] Implement filter state via props
  - [ ] Add filter count badges
  - [ ] Deliverable: Reusable filter component

- [ ] **Task 2.2.5**: Refactor `WarningsPanel.tsx`
  - [ ] Replace inline implementations with new components
  - [ ] Use extracted hooks
  - [ ] Target: Reduce to ~150 lines
  - [ ] Deliverable: Clean container component

---

### 2.3 Frontend Component Extraction - SettingsManager

**Objective**: Break down `SettingsManager.tsx` (410 lines) into section components.

- [ ] **Task 2.3.1**: Create directory structure
  - [ ] Create `frontend/src/components/dashboard/settings/` directory
  - [ ] Create subdirectories: `sections/`, `components/`, `hooks/`
  - [ ] Deliverable: Organized folder structure

- [ ] **Task 2.3.2**: Create `GeolocationSection.tsx`
  - [ ] Extract geolocation logic (lines 21-36, 237-259)
  - [ ] Include map component integration
  - [ ] Use `useGeolocation` hook
  - [ ] Deliverable: Self-contained geolocation section

- [ ] **Task 2.3.3**: Create `BrowserModeSection.tsx`
  - [ ] Extract browser mode selection UI
  - [ ] Implement mode change handlers
  - [ ] Deliverable: Browser mode configuration section

- [ ] **Task 2.3.4**: Create `BrowserConfigSection.tsx`
  - [ ] Extract browser configuration form
  - [ ] Implement config save/load
  - [ ] Deliverable: Browser configuration section

- [ ] **Task 2.3.5**: Create `AuthenticationSection.tsx`
  - [ ] Extract authentication UI
  - [ ] Implement auth state management
  - [ ] Deliverable: Authentication configuration section

- [ ] **Task 2.3.6**: Create `LocationMap.tsx`
  - [ ] Extract map component from SettingsManager
  - [ ] Implement coordinate selection
  - [ ] Deliverable: Reusable map component

- [ ] **Task 2.3.7**: Create `CoordinateInputs.tsx`
  - [ ] Extract coordinate input fields
  - [ ] Add validation
  - [ ] Deliverable: Coordinate input component

- [ ] **Task 2.3.8**: Create `useGeolocation.ts` hook
  - [ ] Extract geolocation detection logic
  - [ ] Implement location state management
  - [ ] Deliverable: Geolocation management hook

- [ ] **Task 2.3.9**: Refactor `SettingsManager.tsx`
  - [ ] Compose sections into main component
  - [ ] Target: Reduce to ~100 lines
  - [ ] Deliverable: Clean container component

---

### 2.4 Scheduler Refactoring

**Objective**: Separate system management from scheduling logic.

- [ ] **Task 2.4.1**: Create `src/core/scheduler/` directory structure
  - [ ] Create main directory and `services/` subdirectory
  - [ ] Deliverable: Organized scheduler module

- [ ] **Task 2.4.2**: Create `CaffeinateManager.ts`
  - [ ] Extract caffeinate management from `scheduler.ts` (lines 15-64)
  - [ ] Implement start/stop methods
  - [ ] Add process cleanup
  - [ ] Deliverable: Isolated system management

- [ ] **Task 2.4.3**: Create `TaskValidator.ts`
  - [ ] Extract task name validation (lines 104-108)
  - [ ] Add comprehensive validation rules
  - [ ] Deliverable: Reusable validator

- [ ] **Task 2.4.4**: Create `Scheduler.ts`
  - [ ] Extract pure scheduling logic
  - [ ] Remove file I/O and system calls
  - [ ] Implement cron job management
  - [ ] Deliverable: Focused scheduler class

- [ ] **Task 2.4.5**: Create scheduler `index.ts`
  - [ ] Implement facade pattern
  - [ ] Wire together Scheduler, CaffeinateManager, TaskValidator
  - [ ] Maintain backward compatible API
  - [ ] Deliverable: Clean entry point

- [ ] **Task 2.4.6**: Deprecate old `scheduler.ts`
  - [ ] Replace with new modular implementation
  - [ ] Update all imports
  - [ ] Deliverable: Migrated scheduler module

---

### Phase 2 Completion Checkpoint

- [ ] All controllers use repository/service layers
- [ ] `WarningsPanel.tsx` under 200 lines
- [ ] `SettingsManager.tsx` under 200 lines
- [ ] Scheduler logic separated from system management
- [ ] Unit tests for all new services
- [ ] No regression in existing functionality
- [ ] **Testing Requirements**:
  - [ ] Service unit tests with mocked repositories
  - [ ] Component tests for extracted UI components
  - [ ] Integration tests for service-to-controller communication
  - [ ] Visual regression tests for component changes

---

## Phase 3: Major Structural Refactoring

**Phase Goal**: Restructure the most complex files (App.tsx, pageWrapper.ts, browserConfig.ts) using architectural patterns.

**Estimated Duration**: 3-4 weeks (consider adding 30-40% buffer time - high complexity phase)
**Prerequisite**: Phase 2 complete

**Rollback Strategy**:
- Create feature branches for each major file refactor
- Keep old implementations in `*Deprecated.ts` backup files during migration
- Use gradual migration with both implementations running side-by-side
- Tag releases before and after each major refactor for quick reverts

---

### 3.1 Frontend State Management Architecture

**Objective**: Restructure `App.tsx` (583 lines) using React Context providers.

- [ ] **Task 3.1.1**: Create `frontend/src/contexts/` directory structure
  - [ ] Set up directory for context providers
  - [ ] Deliverable: Context directory ready

- [ ] **Task 3.1.2**: Create `DashboardContext.tsx`
  - [ ] Extract dashboard layout state from `App.tsx`
  - [ ] Implement card minimize/expand logic
  - [ ] Add layout persistence
  - [ ] Deliverable: Dashboard state provider

- [ ] **Task 3.1.3**: Create `SchedulerContext.tsx`
  - [ ] Extract scheduler status and actions
  - [ ] Implement scheduler state machine
  - [ ] Deliverable: Scheduler state provider

- [ ] **Task 3.1.4**: Create `TasksContext.tsx`
  - [ ] Extract task list and operations
  - [ ] Implement task CRUD operations
  - [ ] Add optimistic updates
  - [ ] Deliverable: Tasks state provider

- [ ] **Task 3.1.5**: Create `LogsContext.tsx`
  - [ ] Extract log management
  - [ ] Implement log streaming
  - [ ] Add log filtering
  - [ ] Deliverable: Logs state provider

- [ ] **Task 3.1.6**: Create `FailuresContext.tsx`
  - [ ] Extract failures state
  - [ ] Implement failure operations
  - [ ] Deliverable: Failures state provider

- [ ] **Task 3.1.7**: Create `AppProviders.tsx`
  - [ ] Compose all context providers
  - [ ] Implement provider hierarchy
  - [ ] Deliverable: Unified provider wrapper

- [ ] **Task 3.1.8**: Create `ApiClient.ts`
  - [ ] Implement centralized API client class
  - [ ] Add request/response interceptors
  - [ ] Implement retry logic
  - [ ] Deliverable: Abstracted API layer

- [ ] **Task 3.1.9**: Refactor `App.tsx`
  - [ ] Replace state with context hooks
  - [ ] Remove inline API calls
  - [ ] Target: Reduce to ~100 lines
  - [ ] Deliverable: Clean application shell

---

### 3.2 PageWrapper Adapter Pattern

**Objective**: Refactor `pageWrapper.ts` (441 lines) using adapter pattern.

- [ ] **Task 3.2.1**: Create `src/core/page/` directory structure
  - [ ] Create `adapters/` subdirectory
  - [ ] Create `types/` subdirectory
  - [ ] Deliverable: Page module structure

- [ ] **Task 3.2.2**: Create `NavigationAdapter.ts`
  - [ ] Extract navigation methods: `goto`, `reload`, `waitForNavigation`
  - [ ] Implement adapter interface
  - [ ] Add navigation helpers
  - [ ] Deliverable: Navigation adapter

- [ ] **Task 3.2.3**: Create `InteractionAdapter.ts`
  - [ ] Extract interaction methods: `click`, `fill`, `type`, `hover`
  - [ ] Add retry logic for flaky interactions
  - [ ] Deliverable: Interaction adapter

- [ ] **Task 3.2.4**: Create `QueryAdapter.ts`
  - [ ] Extract query methods: `$`, `$$`, `locator`
  - [ ] Implement enhanced selectors
  - [ ] Deliverable: Query adapter

- [ ] **Task 3.2.5**: Create `MediaAdapter.ts`
  - [ ] Extract media methods: `screenshot`, `pdf`
  - [ ] Add file management
  - [ ] Deliverable: Media adapter

- [ ] **Task 3.2.6**: Create `MonitoredPage.ts`
  - [ ] Implement core class with only enhanced methods
  - [ ] Compose adapters
  - [ ] Remove method delegations
  - [ ] Deliverable: Slim core class

- [ ] **Task 3.2.7**: Create page module `index.ts`
  - [ ] Implement factory function
  - [ ] Export clean API
  - [ ] Maintain backward compatibility
  - [ ] Deliverable: Clean entry point

- [ ] **Task 3.2.8**: Deprecate old `pageWrapper.ts`
  - [ ] Migrate all usages to new structure
  - [ ] Update imports across codebase
  - [ ] Deliverable: Migrated page wrapper

---

### 3.3 BrowserConfig Separation of Concerns

**Objective**: Refactor `browserConfig.ts` (302 lines) into focused modules.

- [ ] **Task 3.3.1**: Create `src/config/browser/` directory
  - [ ] Set up browser configuration module
  - [ ] Deliverable: Browser config directory

- [ ] **Task 3.3.2**: Create `BrowserLauncher.ts`
  - [ ] Extract browser launch orchestration
  - [ ] Implement launch options building
  - [ ] Deliverable: Launch coordinator

- [ ] **Task 3.3.3**: Create `retryPolicy.ts`
  - [ ] Extract retry logic (lines 197-263)
  - [ ] Make retry configuration customizable
  - [ ] Deliverable: Configurable retry policy

- [ ] **Task 3.3.4**: Create `src/config/profile/` directory
  - [ ] Set up profile management module
  - [ ] Deliverable: Profile directory

- [ ] **Task 3.3.5**: Create `ProfileManager.ts`
  - [ ] Extract profile directory management (lines 28-56)
  - [ ] Implement profile creation/cleanup
  - [ ] Deliverable: Profile management

- [ ] **Task 3.3.6**: Create `lockFileManager.ts`
  - [ ] Extract lock file cleanup (lines 174-190)
  - [ ] Implement safe lock file handling
  - [ ] Deliverable: Lock file management

- [ ] **Task 3.3.7**: Create `src/config/chrome/` directory
  - [ ] Set up Chrome-specific module
  - [ ] Deliverable: Chrome directory

- [ ] **Task 3.3.8**: Create `ChromeResolver.ts`
  - [ ] Extract executable resolution (lines 62-77)
  - [ ] Add cross-platform support
  - [ ] Deliverable: Chrome path resolver

- [ ] **Task 3.3.9**: Create `src/config/settings/` directory
  - [ ] Set up settings management module
  - [ ] Deliverable: Settings directory

- [ ] **Task 3.3.10**: Create `SettingsRepository.ts`
  - [ ] Extract settings file I/O (lines 94-159)
  - [ ] Implement settings caching
  - [ ] Deliverable: Settings data access

- [ ] **Task 3.3.11**: Create browser config `index.ts`
  - [ ] Compose all modules
  - [ ] Export `launchBrowser` function
  - [ ] Maintain backward compatibility
  - [ ] Deliverable: Clean entry point

- [ ] **Task 3.3.12**: Deprecate old `browserConfig.ts`
  - [ ] Migrate all imports
  - [ ] Update configuration consumers
  - [ ] Deliverable: Migrated configuration

---

### 3.4 Dependency Injection Setup

**Objective**: Implement proper dependency injection for services.

- [ ] **Task 3.4.1**: Create `src/server/container.ts`
  - [ ] Implement DI container
  - [ ] Register repositories and services
  - [ ] Deliverable: Service container

- [ ] **Task 3.4.2**: Create `src/server/providers/`
  - [ ] Create provider modules for each service
  - [ ] Implement factory functions
  - [ ] Deliverable: Service providers

- [ ] **Task 3.4.3**: Update controllers for DI
  - [ ] Refactor controllers to accept dependencies
  - [ ] Remove direct instantiation
  - [ ] Deliverable: DI-enabled controllers

---

### Phase 3 Completion Checkpoint

- [ ] `App.tsx` under 150 lines with contexts
- [ ] `pageWrapper.ts` refactored to adapters
- [ ] `browserConfig.ts` split into modules
- [ ] All dependencies injected via container
- [ ] Integration tests passing
- [ ] Performance benchmarks maintained or improved
- [ ] **Testing Requirements**:
  - [ ] Context provider tests with React Testing Library
  - [ ] Adapter unit tests with full coverage
  - [ ] Integration tests for DI container
  - [ ] E2E smoke tests for critical user flows

---

## Phase 4: Performance Optimization & Testing

**Phase Goal**: Address performance issues and establish comprehensive test coverage.

**Estimated Duration**: 2-3 weeks (consider adding 20-30% buffer time)
**Prerequisite**: Phase 3 complete

**Rollback Strategy**: Performance changes should be benchmarked before/after. Revert individual optimizations if they cause regressions. Test infrastructure can be built incrementally without affecting main codebase.

---

### 4.1 Performance Optimizations

**Objective**: Fix identified performance issues.

- [ ] **Task 4.1.1**: Fix `WarningsPanel.tsx` sorting
  - [ ] Memoize sorted failures with `useMemo` (line 207)
  - [ ] Add benchmark before/after
  - [ ] Deliverable: Optimized sorting

- [ ] **Task 4.1.2**: Fix `App.tsx` function recreation
  - [ ] Apply `useCallback` to all event handlers (lines 39-45)
  - [ ] Audit for other optimization opportunities
  - [ ] Deliverable: Optimized callbacks

- [ ] **Task 4.1.3**: Optimize `pageWrapper.ts` method delegation
  - [ ] Consider Proxy pattern for 50+ delegated methods
  - [ ] Measure performance impact
  - [ ] Deliverable: Optimized page wrapper

- [ ] **Task 4.1.4**: Add React.memo where appropriate
  - [ ] Audit component re-renders
  - [ ] Apply memoization to pure components
  - [ ] Deliverable: Reduced re-renders

- [ ] **Task 4.1.5**: Implement virtualization for large lists
  - [ ] Add virtualization to task list if needed
  - [ ] Add virtualization to log console if needed
  - [ ] Deliverable: Scalable list rendering

---

### 4.2 Test Coverage

**Objective**: Achieve >70% test coverage.

- [ ] **Task 4.2.1**: Set up test infrastructure
  - [ ] Configure test coverage reporting
  - [ ] Set up CI/CD test pipeline
  - [ ] Deliverable: Test infrastructure

- [ ] **Task 4.2.2**: Write unit tests for utilities
  - [ ] Test all formatter functions
  - [ ] Test all validators
  - [ ] Test all parsers
  - [ ] Target: 100% utility coverage

- [ ] **Task 4.2.3**: Write unit tests for hooks
  - [ ] Test custom hooks with React Testing Library
  - [ ] Mock API calls and sockets
  - [ ] Target: 80% hook coverage

- [ ] **Task 4.2.4**: Write unit tests for services
  - [ ] Test TaskExecutionService
  - [ ] Test FailureRepository
  - [ ] Test TaskRunner
  - [ ] Target: 80% service coverage

- [ ] **Task 4.2.5**: Write integration tests
  - [ ] Test API endpoints
  - [ ] Test task execution flow
  - [ ] Test scheduler operations
  - [ ] Target: 70% integration coverage

- [ ] **Task 4.2.6**: Write component tests
  - [ ] Test extracted components
  - [ ] Test context providers
  - [ ] Target: 70% component coverage

- [ ] **Task 4.2.7**: Add E2E tests
  - [ ] Set up Playwright for E2E testing
  - [ ] Create critical path tests
  - [ ] Deliverable: E2E test suite

---

### 4.3 Type Safety Improvements

**Objective**: Eliminate `any` types and unsafe casts.

- [ ] **Task 4.3.1**: Fix `pageWrapper.ts` type issues
  - [ ] Remove `as any` casting (line 217)
  - [ ] Fix unsafe function casts (lines 292-305)
  - [ ] Deliverable: Type-safe page wrapper

- [ ] **Task 4.3.2**: Fix `tasks.ts` type issues
  - [ ] Replace `require()` with proper imports (line 94)
  - [ ] Add type safety to dynamic imports
  - [ ] Deliverable: Type-safe task controller

- [ ] **Task 4.3.3**: Enable strict TypeScript mode
  - [ ] Update `tsconfig.json` strict settings
  - [ ] Fix all resulting type errors
  - [ ] Deliverable: Strict TypeScript compliance

---

### Phase 4 Completion Checkpoint

- [ ] All performance issues resolved
- [ ] Test coverage >70%
- [ ] No `any` types in core code
- [ ] All tests passing in CI/CD
- [ ] Performance benchmarks documented

---

## Phase 5: Final Integration & Documentation

**Phase Goal**: Finalize migration, update documentation, and establish maintenance practices.

**Estimated Duration**: 1 week (consider adding 20% buffer time)
**Prerequisite**: Phase 4 complete

**Rollback Strategy**: Minimal rollback risk as this is final cleanup and documentation. Keep tags of previous working states for reference.

---

### 5.1 Final Integration

**Objective**: Ensure all components work together seamlessly.

- [ ] **Task 5.1.1**: End-to-end system testing
  - [ ] Test complete task lifecycle
  - [ ] Test scheduler with real tasks
  - [ ] Test all dashboard features
  - [ ] Deliverable: Verified system functionality

- [ ] **Task 5.1.2**: Regression testing
  - [ ] Compare behavior with original implementation
  - [ ] Document any intentional changes
  - [ ] Deliverable: Regression test report

- [ ] **Task 5.1.3**: Cleanup deprecated code
  - [ ] Remove old implementations
  - [ ] Clean up temporary files
  - [ ] Update build configuration
  - [ ] Deliverable: Clean codebase

---

### 5.2 Documentation Updates

**Objective**: Update all documentation to reflect new architecture.

- [ ] **Task 5.2.1**: Update README.md
  - [ ] Document new architecture
  - [ ] Update setup instructions
  - [ ] Add architecture diagrams
  - [ ] Deliverable: Updated README

- [ ] **Task 5.2.2**: Create Architecture Decision Records (ADRs)
  - [ ] Document context/provider decision
  - [ ] Document adapter pattern decision
  - [ ] Document repository pattern decision
  - [ ] Deliverable: ADR documents

- [ ] **Task 5.2.3**: Create developer onboarding guide
  - [ ] Document code organization
  - [ ] Explain patterns and conventions
  - [ ] Add troubleshooting section
  - [ ] Deliverable: Onboarding guide

- [ ] **Task 5.2.4**: Update API documentation
  - [ ] Document all API endpoints
  - [ ] Add request/response examples
  - [ ] Deliverable: API documentation

---

### 5.3 Maintenance Practices

**Objective**: Establish ongoing maintenance practices.

- [ ] **Task 5.3.1**: Set up code quality gates
  - [ ] Configure linting rules
  - [ ] Set up pre-commit hooks
  - [ ] Configure CI/CD quality checks
  - [ ] Deliverable: Quality automation

- [ ] **Task 5.3.2**: Create monitoring dashboard
  - [ ] Track code metrics over time
  - [ ] Set up file size alerts
  - [ ] Monitor test coverage trends
  - [ ] Deliverable: Monitoring setup

- [ ] **Task 5.3.3**: Document review cycle
  - [ ] Define code review checklist
  - [ ] Schedule architecture reviews
  - [ ] Create refactoring decision tree
  - [ ] Deliverable: Review process

---

### Phase 5 Completion Checkpoint

- [ ] All integration tests passing
- [ ] Documentation complete and accurate
- [ ] Quality gates active
- [ ] Monitoring in place
- [ ] Team trained on new architecture

---

## Post-Implementation Review

### Final Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Files > 300 lines | 5 | TBD | TBD |
| Files > 200 lines | 8 | TBD | TBD |
| Functions > 50 lines | ~15 | TBD | TBD |
| Test Coverage | Unknown | TBD | TBD |
| Circular Dependencies | Unknown | TBD | TBD |

### Lessons Learned

*Document key insights and lessons learned during the refactoring process:*

- [ ] Phase 1 lessons learned
- [ ] Phase 2 lessons learned
- [ ] Phase 3 lessons learned
- [ ] Phase 4 lessons learned
- [ ] Phase 5 lessons learned

### Recommendations for Future

*Document recommendations for ongoing maintenance:*

- [ ] Recommended review frequency
- [ ] Warning signs to watch for
- [ ] Next improvement opportunities

---

## Quick Reference

### Phase Priority Matrix

| Phase | Impact | Risk | Effort | Priority |
|-------|--------|------|--------|----------|
| 1: Foundation | Medium | Low | 1-2 weeks | 1st |
| 2: Services & Components | High | Medium | 2-3 weeks | 2nd |
| 3: Major Refactoring | High | High | 3-4 weeks | 3rd |
| 4: Performance & Tests | High | Low | 2-3 weeks | 4th |
| 5: Integration | Medium | Low | 1 week | 5th |

### Task Status Legend

- `[ ]` - Not started
- `[-]` - In progress
- `[x]` - Complete
- `[~]` - Blocked/Issue

---

*Document Version: 1.0*
*Created: 2026-01-28*
*Last Updated: 2026-01-28*
*Review Cycle: Per Phase Completion*
