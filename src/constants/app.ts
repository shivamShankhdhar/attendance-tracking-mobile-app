/**
 * Central Application Configuration
 * Dynamically populated from EXPO_PUBLIC_APP_NAME environment variable
 */

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'Bizora';

export const APP_TAGLINE = 'Simple attendance for growing businesses';

export const WEBSITE_BASE_URL =
  process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://www.bizora.shivamshankhdhar.online';

export const PRIVACY_POLICY_URL = `${WEBSITE_BASE_URL}/privacy`;
export const ABOUT_URL = `${WEBSITE_BASE_URL}/about`;

