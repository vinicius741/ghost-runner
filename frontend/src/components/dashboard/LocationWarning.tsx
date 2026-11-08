import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationWarningProps {
  onDismiss: () => void;
  onGoToSettings: () => void;
}

export function LocationWarning({ onDismiss, onGoToSettings }: LocationWarningProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-warning/25 bg-warning/[0.06] py-2 pl-4 pr-2"
    >
      <MapPin className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] text-foreground/90">
        Tasks are using the default São Paulo location.{' '}
        <span className="text-muted-foreground">Set your real location so sites see consistent geolocation.</span>
      </p>
      <Button variant="outline" size="sm" onClick={onGoToSettings}>
        Open settings
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss warning">
        <X />
      </Button>
    </div>
  );
}
