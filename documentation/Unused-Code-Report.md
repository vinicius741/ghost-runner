# Unused Code Report

**Generated:** 2026-01-16
**Analysis Scope:** Entire Ghost Runner codebase (Backend + Frontend)

---

## Executive Summary

This report documents all unused code, functions, and modules found in the Ghost Runner project. The analysis covers both the backend (Node.js/TypeScript) and frontend (React + TypeScript) codebases.

**Key Findings:**
- **3 completely unused files** that can be safely removed
- **3 standalone utility scripts** used only via npm scripts (not imported by other modules)
- **Frontend is clean** - all components are actively used

---

## 1. Completely Unused Code (Safe to Remove)

### A. Debug Utility

**File:** `src/server/debug-tasks.ts`

**Purpose:** Debug utility to list all available tasks in different directories (public, private, root)

**Status:** ❌ **COMPLETELY UNUSED**

**Details:**
- No imports or references found anywhere in the codebase
- Not referenced in package.json scripts
- Likely a development debugging tool that was never integrated

**Code:**
```typescript
import fs from 'fs';
import path from 'path';

const taskDirs = [
  { name: 'Public', path: path.join(__dirname, '../../tasks/public') },
  { name: 'Private', path: path.join(__dirname, '../../tasks/private') },
  { name: 'Root', path: path.join(__dirname, '../../tasks') }
];

taskDirs.forEach(dir => {
  console.log(`\n=== ${dir.name} Tasks ===`);
  if (fs.existsSync(dir.path)) {
    const files = fs.readdirSync(dir.path).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    console.log('Found:', files);
  } else {
    console.log('Directory does not exist');
  }
});
```

**Recommendation:** ✅ **Safe to delete**

---

### B. Type Definitions File

**File:** `src/types.d.ts`

**Purpose:** Type definitions file

**Status:** ❌ **COMPLETELY UNUSED**

**Details:**
- No imports found anywhere in the codebase
- Types are likely defined inline in other files
- TypeScript compiler may be configured with different type declaration paths

**Recommendation:** ⚠️ **Review before deletion** - May be used for IDE type hints without explicit imports

---

### C. Stealth Test Script

**File:** `src/utils/test-stealth.ts`

**Purpose:** Test script for browser stealth configuration

**Status:** ❌ **COMPLETELY UNUSED**

**Details:**
- Not imported anywhere in the codebase
- No script references in package.json
- Appears to be a testing utility for stealth browser configuration

**Recommendation:** ✅ **Safe to delete** (unless stealth testing is needed)

---

## 2. Standalone Scripts (Used via npm scripts only)

These files are **not imported** by other modules but are **accessible via CLI** through npm scripts defined in `package.json`.

### A. Task Recorder

**File:** `src/core/record-new-task.ts`

**Purpose:** Standalone script for recording new tasks using Playwright Codegen

**Status:** ⚠️ **PARTIALLY USED** - npm script only

**npm script:**
```json
"record": "tsx src/core/record-new-task.ts"
```

**Usage:**
```bash
npm run record -- --name=mytask --type=private
```

**Recommendation:** ✅ **KEEP** - Useful developer tool, even if not imported

---

### B. Login Setup Script

**File:** `src/utils/run-setup-login.ts`

**Purpose:** Script for manual Google/login setup that saves session to `user_data/`

**Status:** ⚠️ **PARTIALLY USED** - npm script only

**npm script:**
```json
"setup-login": "tsx src/utils/run-setup-login.ts"
```

**Usage:**
```bash
npm run setup-login
```

**Recommendation:** ✅ **KEEP** - Essential for initial authentication setup

---

### C. Session Verification Script

**File:** `src/utils/verify-session.ts`

**Purpose:** Script to verify session persistence

**Status:** ⚠️ **PARTIALLY USED** - npm script only

**npm script:**
```json
"verify-login": "tsx src/utils/verify-session.ts"
```

**Usage:**
```bash
npm run verify-login
```

**Recommendation:** ✅ **KEEP** - Useful debugging tool for session management

---

## 3. Frontend Analysis

### Result: ✅ **ALL COMPONENTS ARE USED**

After thorough analysis of the frontend codebase (`frontend/src/`), **no unused components or code** were found.

**Component hierarchy verification:**
- `App.tsx` imports and uses all major components
- `DashboardGrid.tsx` imports all dashboard widgets
- `ControlPanel.tsx` uses `CreateTaskModal`
- All UI components from shadcn/ui are properly utilized

**Frontend is clean and well-optimized.**

---

## 4. Summary & Recommendations

### Immediate Actions (Safe to Delete)

| File | Reason | Action |
|------|--------|--------|
| `src/server/debug-tasks.ts` | Unused debug utility | ✅ Delete |
| `src/utils/test-stealth.ts` | Unused test script | ✅ Delete |

### Review Before Deletion

| File | Reason | Action |
|------|--------|--------|
| `src/types.d.ts` | May provide IDE type hints | ⚠️ Review with IDE |

### Keep (Developer Tools)

| File | Reason | Action |
|------|--------|--------|
| `src/core/record-new-task.ts` | Used via `npm run record` | ✅ Keep |
| `src/utils/run-setup-login.ts` | Used via `npm run setup-login` | ✅ Keep |
| `src/utils/verify-session.ts` | Used via `npm run verify-login` | ✅ Keep |

---

## 5. Code Health Assessment

**Overall Score:** 🟢 **Good**

- **Backend:** Minimal dead code, well-organized architecture
- **Frontend:** Excellent - no unused components
- **Developer Tools:** Properly isolated as standalone scripts

The codebase demonstrates good maintenance practices with minimal technical debt from unused code.

---

## 6. Cleanup Commands

To remove the confirmed unused files:

```bash
# Remove unused debug utility
rm src/server/debug-tasks.ts

# Remove unused stealth test script
rm src/utils/test-stealth.ts

# Review types.d.ts before deleting (check if IDE uses it)
# rm src/types.d.ts
```

---

*End of Report*
