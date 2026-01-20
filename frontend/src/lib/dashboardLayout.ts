import type { DashboardLayout, DashboardLayoutExtended, MinimizedCard, DashboardCardId } from '@/types';
import { DEFAULT_DASHBOARD_LAYOUT } from '@/types';

const STORAGE_KEY = 'ghost-runner-dashboard-layout';
const SIDEBAR_STORAGE_KEY = 'ghost-runner-sidebar-open';
const CURRENT_VERSION = 5;

const isValidCardId = (id: string): id is DashboardCardId => {
  return ['controlPanel', 'nextTaskTimer', 'scheduleBuilder', 'taskList', 'logsConsole', 'warningsPanel', 'infoGathering'].includes(id);
};

const isValidCardArray = (arr: unknown): arr is DashboardCardId[] => {
  if (!Array.isArray(arr)) return false;
  return arr.every((id: unknown) => typeof id === 'string' && isValidCardId(id));
};

const isValidMinimizedCard = (card: unknown): card is MinimizedCard => {
  if (typeof card !== 'object' || card === null) return false;
  const c = card as Record<string, unknown>;
  const id = c.id;
  // Check id is a valid string before validating
  if (typeof id !== 'string') return false;
  return isValidCardId(id) &&
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
  const l = layout as unknown as Record<string, unknown>;
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

// Migrate version 4 to version 5 (add infoGathering card)
const migrateV4ToV5 = (v4Layout: DashboardLayoutExtended): DashboardLayoutExtended => {
  // If infoGathering is already in the layout, just update version
  if (v4Layout.left.includes('infoGathering') || v4Layout.right.includes('infoGathering')) {
    return { ...v4Layout, version: 5 };
  }

  // Otherwise, add infoGathering to the right column after warningsPanel
  const rightColumn = [...v4Layout.right];
  const warningsPanelIndex = rightColumn.indexOf('warningsPanel');
  if (warningsPanelIndex >= 0) {
    rightColumn.splice(warningsPanelIndex + 1, 0, 'infoGathering');
  } else {
    rightColumn.push('infoGathering');
  }

  return {
    ...v4Layout,
    version: 5,
    right: rightColumn
  };
};

/**
 * Result from getStoredLayout including migration info.
 */
export interface StoredLayoutResult {
  layout: DashboardLayoutExtended;
  /** Migration message if a migration occurred, e.g. "Migrated from v4 to v5" */
  migrationMessage?: string;
}

/**
 * Migration descriptions for user awareness.
 */
const MIGRATION_MESSAGES: Record<number, string> = {
  1: 'Dashboard layout updated: Added two-column layout',
  2: 'Dashboard layout updated: Added Warnings panel',
  3: 'Dashboard layout updated: Added card minimization feature',
  4: 'Dashboard layout updated: Added Information Gathering card',
};

export const getStoredLayout = (): StoredLayoutResult => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { layout: DEFAULT_DASHBOARD_LAYOUT };
    }

    const parsed = JSON.parse(stored);
    let migrationMessage: string | undefined;

    // Migrate version 1 to version 2
    if (parsed.version === 1 && Array.isArray(parsed.order) && typeof parsed.order !== 'undefined') {
      const migrated = migrateV1ToV2(parsed);
      const final = migrateV4ToV5(migrateV3ToV4(migrated));
      saveLayout(final);
      return { layout: final, migrationMessage: MIGRATION_MESSAGES[1] };
    }

    // Migrate version 2 to version 3
    if (parsed.version === 2 && isValidLayout(parsed)) {
      const migrated = migrateV2ToV3(parsed);
      const final = migrateV4ToV5(migrateV3ToV4(migrated));
      saveLayout(final);
      return { layout: final, migrationMessage: MIGRATION_MESSAGES[2] };
    }

    // Migrate version 3 to version 4
    if (parsed.version === 3 && isValidLayout(parsed)) {
      const migrated = migrateV3ToV4(parsed);
      const final = migrateV4ToV5(migrated);
      saveLayout(final);
      return { layout: final, migrationMessage: MIGRATION_MESSAGES[3] };
    }

    // Migrate version 4 to version 5
    if (parsed.version === 4 && isValidLayoutExtended(parsed)) {
      const migrated = migrateV4ToV5(parsed);
      saveLayout(migrated);
      return { layout: migrated, migrationMessage: MIGRATION_MESSAGES[4] };
    }

    // Handle future version mismatches
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return { layout: DEFAULT_DASHBOARD_LAYOUT };
    }

    if (!isValidLayoutExtended(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return { layout: DEFAULT_DASHBOARD_LAYOUT };
    }

    return { layout: parsed, migrationMessage };
  } catch {
    return { layout: DEFAULT_DASHBOARD_LAYOUT };
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
