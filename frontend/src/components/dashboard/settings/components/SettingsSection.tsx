import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** A settings group: label column on the left, controls on the right. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="grid gap-4 px-5 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}
