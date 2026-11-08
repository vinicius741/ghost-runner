import {
  LayoutGrid,
  Layers,
  CalendarClock,
  AlertTriangle,
  Database,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type PageId = 'overview' | 'tasks' | 'schedule' | 'failures' | 'data' | 'logs' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: Layers },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'failures', label: 'Failures', icon: AlertTriangle },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STORAGE_KEY = 'ghost-runner-page';

function isPageId(value: string | null): value is PageId {
  return NAV_ITEMS.some((item) => item.id === value);
}

export function getStoredPage(): PageId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPageId(stored) ? stored : 'overview';
  } catch {
    return 'overview';
  }
}

export function storePage(page: PageId): void {
  try {
    localStorage.setItem(STORAGE_KEY, page);
  } catch {
    // Storage may be unavailable (private mode); navigation still works.
  }
}
