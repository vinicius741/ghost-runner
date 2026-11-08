import { AlertCircle, Bug, MapPin, Timer, type LucideIcon } from 'lucide-react';
import type { FailureErrorType } from '@shared/types';

interface FailureTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Text colour class for the icon / label. */
  tone: string;
}

export const FAILURE_TYPES: Record<FailureErrorType, FailureTypeMeta> = {
  element_not_found: { label: 'Element not found', icon: MapPin, tone: 'text-warning' },
  navigation_failure: { label: 'Navigation failed', icon: AlertCircle, tone: 'text-destructive' },
  timeout: { label: 'Timed out', icon: Timer, tone: 'text-primary' },
  unknown: { label: 'Unknown error', icon: Bug, tone: 'text-muted-foreground' },
};

export function getFailureType(errorType: string): FailureTypeMeta {
  return FAILURE_TYPES[errorType as FailureErrorType] ?? FAILURE_TYPES.unknown;
}
