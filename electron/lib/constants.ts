export const ALLOWED_PERMISSIONS = new Set(['geolocation', 'notifications']);
export const HEALTHCHECK_TIMEOUT_MS = 12_000;
export const HEALTHCHECK_INTERVAL_MS = 300;
export const HEALTHCHECK_REQUEST_TIMEOUT_MS = 1_500;
export const TRAY_POLL_INTERVAL_MS = 15_000;
export const TRAY_COUNTDOWN_INTERVAL_MS = 1_000;
export const TRAY_ICON_HEIGHT_PX = 16;

// Time presets for tray scheduling (in milliseconds)
export const TRAY_SCHEDULE_PRESETS_MS = [
    { label: 'In 5 minutes', delay: 5 * 60 * 1000 },
    { label: 'In 10 minutes', delay: 10 * 60 * 1000 },
    { label: 'In 15 minutes', delay: 15 * 60 * 1000 },
    { label: 'In 30 minutes', delay: 30 * 60 * 1000 },
    { label: 'In 1 hour', delay: 60 * 60 * 1000 },      // Default
    { label: 'In 2 hours', delay: 2 * 60 * 60 * 1000 },
    { label: 'In 4 hours', delay: 4 * 60 * 60 * 1000 },
    { label: 'In 8 hours', delay: 8 * 60 * 60 * 1000 },
    { label: 'In 24 hours', delay: 24 * 60 * 60 * 1000 },
] as const;

// Custom delay options for the "Custom delay..." submenu (additional choices)
export const TRAY_CUSTOM_DELAYS_MS = [
    { label: 'In 45 minutes', delay: 45 * 60 * 1000 },
    { label: 'In 3 hours', delay: 3 * 60 * 60 * 1000 },
    { label: 'In 6 hours', delay: 6 * 60 * 60 * 1000 },
    { label: 'In 12 hours', delay: 12 * 60 * 60 * 1000 },
    { label: 'In 48 hours', delay: 48 * 60 * 60 * 1000 },
] as const;

export const TRAY_DEFAULT_DELAY_MS = 60 * 60 * 1000; // 1 hour
