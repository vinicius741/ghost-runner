import { CARD_RENDERERS, type CardRegistryProps } from './cardRegistry';
import type { DashboardCardId } from '@/types';

interface DragOverlayRendererProps extends CardRegistryProps {
  activeId: DashboardCardId | null;
}

export function DragOverlayRenderer({ activeId, ...cardProps }: DragOverlayRendererProps) {
  if (!activeId) {
    return null;
  }

  const renderer = CARD_RENDERERS[activeId];

  if (!renderer) {
    return null;
  }

  return <>{renderer(cardProps)}</>;
}
