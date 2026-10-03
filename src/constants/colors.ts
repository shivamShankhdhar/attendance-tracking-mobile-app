// Bizora Design System: Olive Green & Natural Sage Palette
// Supports Warm Light Palette and True 100% OLED Pure Black Theme

import { StyleSheet, Appearance } from 'react-native';

export const LightPalette = {
  // Brand tokens (Olive Green)
  brandPrimary: '#5B692D', // Primary CTA ("Approve", "Scan QR", selected tab icon)
  brandPressed: '#465320', // Pressed button, dark brand heading/accent
  brandLight: '#7A8B47',   // Small decorative strokes, outlines
  brandTint: '#EDF3DF',    // Selected surfaces, subtle callouts, icon containers

  // Canvas & Surfaces (Clean crisp pure white light theme)
  canvas: '#FFFFFF',       // Main screen background (pure crisp white)
  surface: '#FFFFFF',      // Cards, fields, modal surfaces
  surfaceMuted: '#F4F5F7', // Secondary grouped areas, pills
  border: '#E5E7EB',       // Cards, input borders, dividers

  // Typography
  textPrimary: '#1B2210',  // Titles and body (deep olive charcoal)
  textSecondary: '#6A755A',// Supporting labels (muted olive grey)
  textInverse: '#FFFFFF',  // On filled primary buttons

  // Semantic Statuses
  success: '#40501E',      // Present / approved
  successTint: '#ECF2DE',  // Present metric box tint
  pending: '#8C6314',      // Pending emphasis (warm amber honey)
  pendingTint: '#FBF4D7',  // Pending metric box tint
  info: '#4B6236',         // Information
  infoTint: '#EBF1E0',     // Subtle guidance surface
  danger: '#BA3B2A',       // Rejected / destructive meaning
  dangerTint: '#FDEAE7',   // Rejection / error surface
  neutralStatus: '#606C52',// Not marked / absent / unavailable
  neutralTint: '#F3F4F6',  // Absent / neutral metric box tint

  // Compatibility aliases for existing screens
  primary: '#5B692D',
  primaryHover: '#465320',
  primaryLight: '#EDF3DF',
  brandSecondary: '#7A8B47',
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  textMuted: '#6A755A',
  present: '#40501E',
  presentBg: '#ECF2DE',
  presentBorder: '#D2DEC0',
  rejected: '#BA3B2A',
  rejectedBg: '#FDEAE7',
  rejectedBorder: '#F5C6C0',
  notMarked: '#606C52',
  notMarkedBg: '#F3F4F6',
  notMarkedBorder: '#E5E7EB',
  closed: '#606C52',
  closedBg: '#F3F4F6',
  closedBorder: '#E5E7EB',
} as const;

export const DarkPalette = {
  // Brand tokens (Vibrant high-contrast olive lime that pops on deep midnight canvas)
  brandPrimary: '#95D624', // Primary CTA, vivid and electric
  brandPressed: '#7CB81B', // Pressed state
  brandLight: '#AEEC3E',   // Accent highlights
  brandTint: '#1C2A10',    // Dark olive-forest badge/pill container surface

  // Canvas & Surfaces (Sleek Midnight Slate Obsidian & Elevated Cards)
  canvas: '#0C0E12',       // Sleek Midnight Slate Obsidian
  surface: '#161920',      // Elevated Midnight Slate Card Surface
  surfaceMuted: '#1F232D', // Secondary grouped lists, pills, inputs
  border: '#282D3A',       // Sleek borders & dividers

  // Typography
  textPrimary: '#FFFFFF',  // Pure crisp white (headers, titles, numbers)
  textSecondary: '#94A3B8',// Clean neutral readable secondary slate
  textInverse: '#FFFFFF',  // White text on filled primary buttons

  // Semantic Statuses
  success: '#4ADE80',
  successTint: '#0F2918',
  pending: '#FBBF24',
  pendingTint: '#2D1F08',
  info: '#38BDF8',
  infoTint: '#0A2233',
  danger: '#F87171',
  dangerTint: '#2D1313',
  neutralStatus: '#94A3B8',
  neutralTint: '#1F232D',

  // Compatibility aliases
  primary: '#95D624',
  primaryHover: '#7CB81B',
  primaryLight: '#1C2A10',
  brandSecondary: '#AEEC3E',
  background: '#0C0E12',
  card: '#161920',
  cardBg: '#161920',
  cardBorder: '#282D3A',
  textMuted: '#94A3B8',
  present: '#4ADE80',
  presentBg: '#0F2918',
  presentBorder: '#1B4D2C',
  rejected: '#F87171',
  rejectedBg: '#2D1313',
  rejectedBorder: '#592323',
  notMarked: '#94A3B8',
  notMarkedBg: '#1F232D',
  notMarkedBorder: '#282D3A',
  closed: '#94A3B8',
  closedBg: '#1F232D',
  closedBorder: '#282D3A',
};

export type PaletteType = Record<keyof typeof LightPalette, string>;

export function getIsDark(): boolean {
  return false;
}

export function setPaletteTheme(_isDark: boolean) {
  // Dark theme completely removed
}

export const Palette: PaletteType = LightPalette;

export type ColorToken = keyof typeof LightPalette;

// Mapping of light colors and common neutrals to their sleek midnight slate counterparts
const COLOR_TRANSFORM_MAP: Record<string, string> = {
  // Canvas / Backgrounds -> Midnight Slate Obsidian (#0C0E12)
  '#F5F6E8': '#0C0E12',
  '#f5f6e8': '#0C0E12',
  '#F5F7EE': '#0C0E12',
  '#f5f7ee': '#0C0E12',
  '#0B0D08': '#0C0E12',
  '#0b0d08': '#0C0E12',
  '#0E140D': '#0C0E12',
  '#000000': '#0C0E12',
  '#000': '#0C0E12',
  '#ECEFE1': '#161920',
  '#ecefe1': '#161920',
  '#F5F8EE': '#11141A',

  // Surfaces / Cards -> Sleek Elevated Midnight Slate (#161920)
  '#FFFFFF': '#161920',
  '#ffffff': '#161920',
  '#fff': '#161920',
  '#FFF': '#161920',
  '#111111': '#161920',
  '#141710': '#161920',
  '#182214': '#161920',
  '#F8F6F5': '#1A1D25',

  // Muted Surfaces -> #1F232D
  '#EFF2E3': '#1F232D',
  '#eff2e3': '#1F232D',
  '#1A1A1A': '#1F232D',
  '#222E1B': '#1F232D',
  '#1C2117': '#1F232D',
  '#F9FBF2': '#1F232D',
  '#F3F4F6': '#1F232D',
  '#F4F5F7': '#1F232D',
  '#f4f5f7': '#1F232D',
  '#FAFAF7': '#1F232D',
  '#F8F8F5': '#1F232D',
  '#F8F7F6': '#1F232D',
  '#F9F9F7': '#1F232D',
  '#F1EFEF': '#1F232D',

  // Borders -> #282D3A
  '#E2E6D2': '#282D3A',
  '#e2e6d2': '#282D3A',
  '#D8E0CB': '#282D3A',
  '#d8e0cb': '#282D3A',
  '#D8E2C4': '#282D3A',
  '#d8e2c4': '#282D3A',
  '#DCE4CD': '#282D3A',
  '#E5E7EB': '#282D3A',
  '#e5e7eb': '#282D3A',
  '#E2E8F0': '#282D3A',
  '#e2e8f0': '#282D3A',
  '#242424': '#282D3A',
  '#2E3D25': '#282D3A',
  '#CBD5E1': '#363D4E',
  '#282F20': '#282D3A',
  '#2A3423': '#282D3A',
  '#F0EBE8': '#282D3A',
  '#f0ebe8': '#282D3A',
  '#EAE5E2': '#282D3A',
  '#eae5e2': '#282D3A',
  '#EFEAE6': '#282D3A',
  '#efeae6': '#282D3A',
  '#E8E5E3': '#282D3A',
  '#e8e5e3': '#282D3A',
  '#DDE2CC': '#282D3A',
  '#dde2cc': '#282D3A',
  '#D4DEC2': '#282D3A',
  '#d4dec2': '#282D3A',
  '#D1D5DB': '#282D3A',
  '#d1d5db': '#282D3A',

  // Slate & Cool Grays
  '#F1F5F9': '#1F232D',
  '#f1f5f9': '#1F232D',
  '#F8FAFC': '#1A1D25',
  '#f8fafc': '#1A1D25',
  '#64748B': '#94A3B8',
  '#64748b': '#94A3B8',
  '#334155': '#F8FAFC',
  '#1E293B': '#F8FAFC',
  '#0F172A': '#0C0E12',
  '#94A3B8': '#94A3B8',
  '#ECFDF5': '#0F2918',
  '#A7F3D0': '#1B4D2C',
  '#047857': '#4ADE80',
  '#10B981': '#4ADE80',

  // Text Primary -> Pure Crisp White (#FFFFFF)
  '#1B2210': '#FFFFFF',
  '#1b2210': '#FFFFFF',
  '#17202A': '#FFFFFF',
  '#17202a': '#FFFFFF',

  // Text Secondary -> Clean Natural Slate (#94A3B8)
  '#6A755A': '#94A3B8',
  '#6a755a': '#94A3B8',
  '#96A288': '#94A3B8',
  '#4B5563': '#94A3B8',
  '#6B7280': '#94A3B8',
  '#9CA3AF': '#94A3B8',
  '#686461': '#94A3B8',

  // Brand Primary & Pressed -> High-contrast Olive Lime
  '#5B692D': '#95D624',
  '#5b692d': '#95D624',
  '#465320': '#7CB81B',
  '#7A8B47': '#AEEC3E',
  '#829B35': '#95D624',
  '#677C26': '#7CB81B',
  '#9EC33C': '#95D624',

  // Brand Tint -> Dark Olive Forest (#1C2A10)
  '#EDF3DF': '#1C2A10',
  '#edf3df': '#1C2A10',
  '#212816': '#1C2A10',
  '#24331A': '#1C2A10',

  // Statuses & Callouts
  '#40501E': '#4ADE80',
  '#ECF2DE': '#0F2918',
  '#759D37': '#4ADE80',
  '#18260F': '#0F2918',
  '#D2DEC0': '#1B4D2C',
  '#DCFCE7': '#0F2918',
  '#dcfce7': '#0F2918',
  '#EAF7EE': '#0F2918',
  '#E6F7ED': '#0F2918',
  '#F0FDF4': '#0F2918',
  '#16A34A': '#4ADE80',
  '#BBF7D0': '#1B4D2C',

  '#BA3B2A': '#F87171',
  '#FDEAE7': '#2D1313',
  '#E85542': '#F87171',
  '#351512': '#2D1313',
  '#F5C6C0': '#592323',
  '#FEF2F2': '#2D1313',
  '#FEE2E2': '#2D1313',
  '#FFF5F5': '#2D1313',
  '#FFF1F2': '#2D1313',

  '#8C6314': '#FBBF24',
  '#FBF4D7': '#2D1F08',
  '#D49B28': '#FBBF24',
  '#2E220B': '#2D1F08',
  '#FEF3C7': '#2D1F08',
  '#FEF9E7': '#2D1F08',
  '#FCF3CF': '#2D1F08',
  '#FDF2E9': '#2D1F08',
  '#FFFBEB': '#2D1F08',
  '#F5CBA7': '#5C3E14',
  '#FDE68A': '#5C3E14',
  '#D97706': '#FBBF24',

  '#606C52': '#94A3B8',
  '#ECF1DD': '#1F232D',
  '#889777': '#94A3B8',
  '#1E2519': '#1F232D',

  // Decorative waves
  '#EDF2E1': '#141822',
  '#E4ECD5': '#10141C',
  '#DFE6CF': '#161920',
  '#E2E8D3': '#1A1E27',
  '#E6ECD8': '#1D222C',
  '#EAF0DC': '#202532',
};

// Reverse mapping: from dark / deep surfaces to clean light equivalents
const DARK_TO_LIGHT_MAP: Record<string, string> = {
  // Midnight Slate Obsidian / Blacks to White
  '#0C0E12': '#FFFFFF',
  '#0E140D': '#FFFFFF',
  '#000000': '#FFFFFF',
  '#000': '#FFFFFF',
  '#0B0D08': '#FFFFFF',
  '#0b0d08': '#FFFFFF',
  '#161920': '#FFFFFF',
  '#182214': '#FFFFFF',
  '#111111': '#FFFFFF',
  '#161616': '#FFFFFF',
  '#141710': '#FFFFFF',
  '#11141A': '#F4F5F7',

  // Dark Muted Surfaces / Pills to Light Neutral
  '#1F232D': '#F4F5F7',
  '#222E1B': '#F4F5F7',
  '#1A1A1A': '#F4F5F7',
  '#1C1C1E': '#F4F5F7',
  '#1C2419': '#F4F5F7',
  '#1C2117': '#F4F5F7',

  // Dark Borders to Light Gray Borders
  '#282D3A': '#E5E7EB',
  '#2E3D25': '#E5E7EB',
  '#242424': '#E5E7EB',
  '#262626': '#E5E7EB',
  '#2C2C2E': '#E5E7EB',
  '#282F20': '#E5E7EB',
  '#2A3423': '#E5E7EB',

  // Dark Tints to Light Pastel Tints
  '#1C2A10': '#EDF3DF',
  '#24331A': '#EDF3DF',
  '#0F2918': '#ECF2DE',
  '#2D1F08': '#FBF4D7',
  '#2D1313': '#FDEAE7',
  '#0A2233': '#EBF1E0',
  '#1B4D2C': '#D2DEC0',
  '#592323': '#F5C6C0',
  '#5C3E14': '#F5CBA7',

  // Dark Lime Brand tokens to Olive Brand tokens
  '#95D624': '#5B692D',
  '#7CB81B': '#465320',
  '#AEEC3E': '#7A8B47',

  // Statuses
  '#4ADE80': '#40501E',
  '#FBBF24': '#8C6314',
  '#F87171': '#BA3B2A',
  '#94A3B8': '#6A755A',
};

function isOliveOrDarkBgColor(bg: string | undefined): boolean {
  if (!bg || typeof bg !== 'string') return false;
  const b = bg.toLowerCase().trim();
  // Olive brand tokens, olive tints, and dark accents
  if (
    b === '#5b692d' ||
    b === '#465320' ||
    b === '#7a8b47' ||
    b === '#40501e' ||
    b === '#4b6236' ||
    b === '#3e4a32' ||
    b === '#7d8d6b' ||
    b === '#6b7a38' ||
    b === '#546328' ||
    b === '#829b35' ||
    b === '#677c26' ||
    b === '#9ec33c' ||
    b === '#ba3b2a' ||
    b === '#8c6314' ||
    b === '#1b2210' ||
    b.includes('5b692d') ||
    b.includes('465320') ||
    b.includes('7a8b47')
  ) {
    return true;
  }
  if (b.startsWith('#') && (b.length === 7 || b.length === 4)) {
    let r = 0, g = 0, bl = 0;
    if (b.length === 7) {
      r = parseInt(b.slice(1, 3), 16) || 0;
      g = parseInt(b.slice(3, 5), 16) || 0;
      bl = parseInt(b.slice(5, 7), 16) || 0;
    } else {
      r = parseInt(b[1] + b[1], 16) || 0;
      g = parseInt(b[2] + b[2], 16) || 0;
      bl = parseInt(b[3] + b[3], 16) || 0;
    }
    const isOliveTone = g > 65 && g > bl * 1.25 && r > 45 && r < 165 && bl < 95;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    return isOliveTone || lum < 125;
  }
  return false;
}

function transformStyleRuleToLight(rule: any, key?: string, parentHasOliveBg?: boolean): any {
  if (!rule || typeof rule !== 'object') return rule;
  const k = (key || '').toLowerCase();
  // QR code frames / badges must always maintain clean white background for scanning
  if (k.includes('qrbadge') || k.includes('qrtile') || k.includes('qrframe') || k.includes('qrcodebox') || k.includes('qrwhite')) {
    return rule;
  }
  const res: any = { ...rule };
  let effectiveBg = res.backgroundColor;
  if (effectiveBg && DARK_TO_LIGHT_MAP[effectiveBg]) {
    effectiveBg = DARK_TO_LIGHT_MAP[effectiveBg];
  }
  const hasDarkOrOliveBg = parentHasOliveBg || isOliveOrDarkBgColor(effectiveBg);

  for (const prop of Object.keys(res)) {
    const val = res[prop];
    if (typeof val === 'string') {
      if (val.startsWith('rgba(')) continue;
      // Do not convert pure black if it's drop shadow
      if (prop === 'shadowColor') continue;

      // Handle text/icon color in Light Mode:
      // If there is an olive or dark background, text/icons MUST be pure white (#FFFFFF)
      if (prop === 'color' || prop === 'tintColor') {
        if (hasDarkOrOliveBg) {
          res[prop] = '#FFFFFF';
          continue;
        }

        // If a rule has white (#FFFFFF) text/tint, but sits on a light/transparent surface:
        if (val === '#FFFFFF' || val === '#ffffff' || val === '#fff' || val === '#FFF') {
          const isInverseOrOliveText =
            k.includes('btntext') ||
            k.includes('buttontext') ||
            k.includes('ctatext') ||
            k.includes('inversetext') ||
            k.includes('inverse') ||
            k.includes('active') ||
            k.includes('selected') ||
            k.includes('badge') ||
            k.includes('pill') ||
            k.includes('chip') ||
            k.includes('olive') ||
            k.includes('solid') ||
            k.includes('tag') ||
            k.includes('toast') ||
            k.includes('banner') ||
            k.includes('indicator') ||
            k.includes('highlight') ||
            k.includes('white');
          if (!isInverseOrOliveText) {
            res[prop] = '#1B2210';
            continue;
          }
        }
      }

      if (DARK_TO_LIGHT_MAP[val]) {
        res[prop] = DARK_TO_LIGHT_MAP[val];
      }
    }
  }
  return res;
}

// Monkey-patch StyleSheet.create so every style sheet in the entire app runs clean Light theme with white text on olive
const originalStyleSheetCreate = StyleSheet.create;

(StyleSheet as any).create = function<T extends Record<string, any>>(stylesObj: T): T {
  const lightStyles: Record<string, any> = {};

  // First pass: identify all keys in stylesObj that have an olive or dark background
  const oliveBgKeys = new Set<string>();
  for (const key of Object.keys(stylesObj)) {
    const rule = stylesObj[key];
    if (rule && typeof rule === 'object') {
      let bg = rule.backgroundColor;
      if (bg && DARK_TO_LIGHT_MAP[bg]) bg = DARK_TO_LIGHT_MAP[bg];
      if (isOliveOrDarkBgColor(bg)) {
        oliveBgKeys.add(key.toLowerCase());
      }
    }
  }

  for (const key of Object.keys(stylesObj)) {
    const rule = stylesObj[key];
    if (rule && typeof rule === 'object') {
      const isCamera = key.toLowerCase().includes('camera');
      const kLow = key.toLowerCase();
      // Check if this rule is a text/label/icon specifically associated with an olive container in the same stylesheet
      let parentHasOlive = false;
      for (const parentKey of oliveBgKeys) {
        if (
          kLow === parentKey ||
          kLow === parentKey + 'text' ||
          kLow === parentKey + 'label' ||
          kLow === parentKey + 'title' ||
          kLow === parentKey + 'sub' ||
          kLow === parentKey + 'icon' ||
          kLow === parentKey + 'num' ||
          kLow === parentKey + 'name' ||
          kLow === parentKey + 'desc' ||
          kLow.startsWith(parentKey + '_') ||
          kLow.startsWith(parentKey + '-')
        ) {
          parentHasOlive = true;
          break;
        }
      }
      lightStyles[key] = isCamera ? { ...rule } : transformStyleRuleToLight(rule, key, parentHasOlive);
    } else {
      lightStyles[key] = rule;
    }
  }

  return lightStyles as T;
};
