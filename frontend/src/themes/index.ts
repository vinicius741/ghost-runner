/**
 * Ghost Runner Theme System
 *
 * Three distinctive themes that transform the entire UI:
 * - Midnight Protocol: Cyberpunk command center with electric blue accents
 * - Obsidian Noir: Luxury dark mode with warm copper/gold accents
 * - Synthwave Sunset: 80s retro-futurism with neon pink/cyan
 */

export type ThemeId = 'midnight-protocol' | 'obsidian-noir' | 'synthwave-sunset';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  typography: {
    sans: string;
    mono: string;
    display: string;
  };
  radius: string;
  effects: {
    glow: boolean;
    texture: boolean;
  };
}

export const themes: Record<ThemeId, ThemeConfig> = {
  'midnight-protocol': {
    id: 'midnight-protocol',
    name: 'Midnight Protocol',
    description: 'Cyberpunk command center with electric blue accents',
    icon: 'shield',
    colors: {
      primary: '#3B82F6',
      accent: '#60A5FA',
      background: '#0A0F1A',
    },
    typography: {
      sans: 'Inter',
      mono: 'JetBrains Mono',
      display: 'Inter',
    },
    radius: '0.75rem',
    effects: {
      glow: true,
      texture: true,
    },
  },
  'obsidian-noir': {
    id: 'obsidian-noir',
    name: 'Obsidian Noir',
    description: 'Luxury dark mode with warm copper/gold accents',
    icon: 'gem',
    colors: {
      primary: '#CD7F32',
      accent: '#FFD700',
      background: '#080808',
    },
    typography: {
      sans: 'DM Sans',
      mono: 'JetBrains Mono',
      display: 'Crimson Pro',
    },
    radius: '0.375rem',
    effects: {
      glow: true,
      texture: true,
    },
  },
  'synthwave-sunset': {
    id: 'synthwave-sunset',
    name: 'Synthwave Sunset',
    description: '80s retro-futurism with neon pink/cyan',
    icon: 'sun',
    colors: {
      primary: '#EC4899',
      accent: '#06B6D4',
      background: '#14081A',
    },
    typography: {
      sans: 'Outfit',
      mono: 'JetBrains Mono',
      display: 'Space Grotesk',
    },
    radius: '1.25rem',
    effects: {
      glow: true,
      texture: true,
    },
  },
};

export const themeList = Object.values(themes);

export const defaultTheme: ThemeId = 'midnight-protocol';

export function isValidTheme(theme: string | null): theme is ThemeId {
  return theme !== null && theme in themes;
}
