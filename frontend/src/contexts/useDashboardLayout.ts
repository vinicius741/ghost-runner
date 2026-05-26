import { useState, useCallback, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Settings } from '@shared/types';
import { DEFAULT_LOCATION } from '@shared/types';
import type {
  DashboardCardId,
  DashboardLayoutExtended,
  DashboardColumn,
  MinimizedCard,
} from '@/types';
import { getStoredLayout, saveLayout, getSidebarState, saveSidebarState, type StoredLayoutResult } from '@/lib/dashboardLayout';
import type { LogType } from './useDashboardLogs';

/**
 * Hook to manage dashboard layout panels (left/right reordering, minimization),
 * settings persistence, and sidebar states.
 */
export function useDashboardLayout(addLog: (message: string, type?: LogType) => void) {
  // Initialize layout and handle migration message
  const initialLayoutResult: StoredLayoutResult = getStoredLayout();

  const [layout, setLayout] = useState<DashboardLayoutExtended>(() => initialLayoutResult.layout);
  const [sidebarOpen, setSidebarOpen] = useState(() => getSidebarState());
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Migration message ref
  const migrationMessageShownRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings && data.settings.geolocation) {
        setSettings(data.settings);
      }
    } catch (error) {
      addLog('Error fetching settings', 'error');
      console.error('Error fetching settings:', error);
    }
  }, [addLog]);

  const handleCardReorder = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as DashboardCardId;
    const overId = over.id as DashboardCardId;

    setLayout((currentLayout) => {
      const activeColumn: DashboardColumn = currentLayout.left.includes(activeId) ? 'left' : 'right';
      const overColumn: DashboardColumn = currentLayout.left.includes(overId) ? 'left' : 'right';

      const sourceArray = currentLayout[activeColumn];
      const targetArray = currentLayout[overColumn];

      const oldIndex = sourceArray.indexOf(activeId);
      const newIndex = targetArray.indexOf(overId);

      let newLayout: DashboardLayoutExtended;

      if (activeColumn === overColumn) {
        const newArray = arrayMove(sourceArray, oldIndex, newIndex);
        newLayout = { ...currentLayout, [activeColumn]: newArray };
      } else {
        const newSourceArray = [...sourceArray];
        const newTargetArray = [...targetArray];
        newSourceArray.splice(oldIndex, 1);
        newTargetArray.splice(newIndex, 0, activeId);
        newLayout = {
          ...currentLayout,
          [activeColumn]: newSourceArray,
          [overColumn]: newTargetArray,
        };
      }

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const minimizeCard = useCallback((cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      let sourceColumn: DashboardColumn | null = null;
      let sourceIndex = -1;

      if (currentLayout.left.includes(cardId)) {
        sourceColumn = 'left';
        sourceIndex = currentLayout.left.indexOf(cardId);
      } else if (currentLayout.right.includes(cardId)) {
        sourceColumn = 'right';
        sourceIndex = currentLayout.right.indexOf(cardId);
      }

      if (!sourceColumn || sourceIndex === -1) {
        return currentLayout;
      }

      const minimizedCard: MinimizedCard = {
        id: cardId,
        column: sourceColumn,
        index: sourceIndex,
      };

      const newColumnArray = [...currentLayout[sourceColumn]];
      newColumnArray.splice(sourceIndex, 1);

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [sourceColumn]: newColumnArray,
        minimized: [...currentLayout.minimized, minimizedCard],
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const restoreCard = useCallback((cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      const minimizedCardIndex = currentLayout.minimized.findIndex((m) => m.id === cardId);
      if (minimizedCardIndex === -1) {
        return currentLayout;
      }

      const minimizedCard = currentLayout.minimized[minimizedCardIndex];
      const targetColumn = minimizedCard.column;

      const newMinimized = [...currentLayout.minimized];
      newMinimized.splice(minimizedCardIndex, 1);

      const newColumnArray = [...currentLayout[targetColumn], cardId];

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [targetColumn]: newColumnArray,
        minimized: newMinimized,
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const newState = !prev;
      saveSidebarState(newState);
      return newState;
    });
  }, []);

  const dismissLocationWarning = useCallback(() => {
    setLocationWarningDismissed(true);
  }, []);

  // Fetch initial settings and output layout migration warnings on mount
  useEffect(() => {
    fetchSettings();

    if (!migrationMessageShownRef.current && initialLayoutResult.migrationMessage) {
      addLog(initialLayoutResult.migrationMessage, 'system');
      migrationMessageShownRef.current = true;
    }
  }, [fetchSettings, initialLayoutResult.migrationMessage, addLog]);

  // Derived states
  const isUsingDefaultLocation = Boolean(
    settings?.geolocation &&
    settings.geolocation.latitude === DEFAULT_LOCATION.latitude &&
    settings.geolocation.longitude === DEFAULT_LOCATION.longitude
  );

  const showLocationWarning = isUsingDefaultLocation && !locationWarningDismissed;

  return {
    layout,
    sidebarOpen,
    settings,
    showLocationWarning,
    fetchSettings,
    handleCardReorder,
    minimizeCard,
    restoreCard,
    toggleSidebar,
    dismissLocationWarning,
  };
}
