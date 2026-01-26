import { SortableCard } from '../SortableCard';
import { CARD_RENDERERS, type CardRegistryProps } from './cardRegistry';
import { CARD_METADATA } from '@/types';
import type { DashboardCardId } from '@/types';

interface DashboardCardRendererProps extends CardRegistryProps {
  cardId: DashboardCardId;
  onMinimize?: (cardId: DashboardCardId) => void;
}

export function DashboardCardRenderer({ cardId, onMinimize, ...cardProps }: DashboardCardRendererProps) {
  const title = CARD_METADATA[cardId].displayName;
  const renderer = CARD_RENDERERS[cardId];

  if (!renderer) {
    return null;
  }

  return (
    <SortableCard
      key={cardId}
      id={cardId}
      onMinimize={onMinimize ? () => onMinimize(cardId) : undefined}
      title={title}
    >
      {renderer({ ...cardProps, onHeaderDoubleClick: onMinimize ? () => onMinimize(cardId) : undefined })}
    </SortableCard>
  );
}
