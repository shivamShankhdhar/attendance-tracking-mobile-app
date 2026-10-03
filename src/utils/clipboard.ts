import { Platform } from 'react-native';

/**
 * Safe clipboard helper.
 * Uses navigator.clipboard / execCommand on web,
 * and expo-clipboard on native when compiled into the app binary,
 * with safe try/catch wrappers so it never crashes unlinked development builds.
 */

let nativeClipboard: {
  setStringAsync?: (text: string) => Promise<boolean>;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeClipboard = require('expo-clipboard');
} catch {
  // ExpoClipboard native module not linked into current development build
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Web browser clipboard APIs
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) return true;
      }
    } catch {
      // Web clipboard write failed
    }
  }

  // 2. Native Expo Clipboard module (when linked in the app binary)
  try {
    if (nativeClipboard && typeof nativeClipboard.setStringAsync === 'function') {
      const result = await nativeClipboard.setStringAsync(text);
      if (result) return true;
    }
  } catch {
    // Native module call failed or unlinked
  }

  return false;
}

