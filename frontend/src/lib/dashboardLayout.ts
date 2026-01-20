import type { DashboardLayout, DashboardLayoutExtended, MinimizedCard, DashboardCardId } from '@/types';
import { DEFAULT_DASHBOARD_LAYOUT } from '@/types';

const STORAGE_KEY = 'ghost-runner-dashboard-layout';
const SIDEBAR_STORAGE_KEY = 'ghost-runner-sidebar-open';
const CURRENT_VERSION = 4;

const isValidCardId = (id: string): id is DashboardCardId => {
  return ['controlPanel', 'nextTaskTimer', 'scheduleBuilder', 'taskList', 'logsConsole', 'warningsPanel'].includes(id);
};

const isValidCardArray = (arr: unknown): arr is DashboardCardId[] => {
  if (!Array.isArray(arr)) return false;
  return arr.every((id: unknown) => typeof id === 'string' && isValidCardId(id));
};

const isValidMinimizedCard = (card: unknown): card is MinimizedCard => {
  if (typeof card !== 'object' || card === null) return false;
  const c = card as Record<string, unknown>;
  return isValidCardId(c.id) &&
    (c.column === 'left' || c.column === 'right') &&
    typeof c.index === 'number';
};

const isValidMinimizedArray = (arr: unknown): arr is MinimizedCard[] => {
  if (!Array.isArray(arr)) return false;
  return arr.every((item: unknown) => isValidMinimizedCard(item));
};

const isValidLayout = (layout: unknown): layout is DashboardLayout => {
  if (typeof layout !== 'object' || layout === null) return false;
  const l = layout as Record<string, unknown>;
  if (typeof l.version !== 'number') return false;
  if (!isValidCardArray(l.left)) return false;
  if (!isValidCardArray(l.right)) return false;
  return true;
};

const isValidLayoutExtended = (layout: unknown): layout is DashboardLayoutExtended => {
  if (!isValidLayout(layout)) return false;
  const l = layout as Record<string, unknown>;
  return l.minimized === undefined || isValidMinimizedArray(l.minimized);
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

// Migrate version 3 to version 4 (add minimized array)
const migrateV3ToV4 = (v3Layout: DashboardLayout): DashboardLayoutExtended => {
  return {
    version: 4,
    left: v3Layout.left,
    right: v3Layout.right,
    minimized: []
  };
};

export const getStoredLayout = (): DashboardLayoutExtended => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_DASHBOARD_LAYOUT;

    const parsed = JSON.parse(stored);

    // Migrate version 1 to version 2
    if (parsed.version === 1 && Array.isArray(parsed.order) && typeof parsed.order !== 'undefined') {
      const migrated = migrateV1ToV2(parsed);
      saveLayout(migrateV3ToV4(migrated));
      return migrateV3ToV4(migrated);
    }

    // Migrate version 2 to version 3
    if (parsed.version === 2 && isValidLayout(parsed)) {
      const migrated = migrateV2ToV3(parsed);
      saveLayout(migrateV3ToV4(migrated));
      return migrateV3ToV4(migrated);
    }

    // Migrate version 3 to version 4
    if (parsed.version === 3 && isValidLayout(parsed)) {
      const migrated = migrateV3ToV4(parsed);
      saveLayout(migrated);
      return migrated;
    }

    // Handle future version mismatches
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_DASHBOARD_LAYOUT;
    }

    if (!isValidLayoutExtended(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_DASHBOARD_LAYOUT;
    }

    return parsed;
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
};

export const saveLayout = (layout: DashboardLayoutExtended): void => {
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

export const getSidebarState = (): boolean => {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

export const saveSidebarState = (isOpen: boolean): void => {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  } catch (error) {
    console.error('Failed to save sidebar state:', error);
  }
};
