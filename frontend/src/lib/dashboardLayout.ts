import type { DashboardLayout, DashboardCardId } from '@/types';
import { DEFAULT_DASHBOARD_LAYOUT } from '@/types';

const STORAGE_KEY = 'ghost-runner-dashboard-layout';
const CURRENT_VERSION = 3;

const isValidCardId = (id: string): id is DashboardCardId => {
  return ['controlPanel', 'nextTaskTimer', 'scheduleBuilder', 'taskList', 'logsConsole', 'warningsPanel'].includes(id);
};

const isValidCardArray = (arr: unknown): arr is DashboardCardId[] => {
  if (!Array.isArray(arr)) return false;
  return arr.every((id: unknown) => typeof id === 'string' && isValidCardId(id));
};

const isValidLayout = (layout: unknown): layout is DashboardLayout => {
  if (typeof layout !== 'object' || layout === null) return false;
  const l = layout as Record<string, unknown>;
  if (typeof l.version !== 'number') return false;
  if (!isValidCardArray(l.left)) return false;
  if (!isValidCardArray(l.right)) return false;
  return true;
};

// Migrate old version 1 format (single order array) to version 2 (two columns)
const migrateV1ToV2 = (oldLayout: { order: DashboardCardId[] }): DashboardLayout => {
  const { order } = oldLayout;
  // For v1, put first 3 cards in left, rest in right
  return {
    version: 2,
    left: order.slice(0, 3),
    right: order.slice(3)
  };
};

// Migrate version 2 to version 3 (add warningsPanel to right column)
const migrateV2ToV3 = (v2Layout: DashboardLayout): DashboardLayout => {
  return {
    version: 3,
    left: v2Layout.left,
    // Insert warningsPanel between taskList and logsConsole
    right: v2Layout.right.flatMap((card) =>
      card === 'logsConsole' ? ['warningsPanel', card] : [card]
    ) as DashboardCardId[]
  };
};

export const getStoredLayout = (): DashboardLayout => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_DASHBOARD_LAYOUT;

    const parsed = JSON.parse(stored);

    // Migrate version 1 to version 2
    if (parsed.version === 1 && Array.isArray(parsed.order) && typeof parsed.order !== 'undefined') {
      const migrated = migrateV1ToV2(parsed);
      saveLayout(migrated);
      return migrated;
    }

    // Migrate version 2 to version 3
    if (parsed.version === 2 && isValidLayout(parsed)) {
      const migrated = migrateV2ToV3(parsed);
      saveLayout(migrated);
      return migrated;
    }

    // Handle future version mismatches
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_DASHBOARD_LAYOUT;
    }

    if (!isValidLayout(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_DASHBOARD_LAYOUT;
    }

    return parsed;
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
};

export const saveLayout = (layout: DashboardLayout): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
  }
};

export const resetLayout = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset dashboard layout:', error);
  }
};
