import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const joinHost = new URL(process.env.EXPO_PUBLIC_JOIN_BASE_URL || 'https://www.bizora.shivamshankhdhar.online/join').hostname;
  const branchDomain = process.env.EXPO_PUBLIC_BRANCH_DOMAIN;
  const branchKey = process.env.EXPO_PUBLIC_BRANCH_KEY;
  const domains = [...new Set([joinHost, ...(branchDomain ? [branchDomain, branchDomain.replace('.app.link', '-alternate.app.link')] : [])])];
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  return {
    ...config, name: config.name || 'Bizora', slug: config.slug || 'bizora',
    web: { ...config.web, output: 'single' },
    ios: { ...config.ios, associatedDomains: domains.map((domain) => `applinks:${domain}`) },
    android: { ...config.android, intentFilters: [{ action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'], data: domains.map((host) => ({ scheme: 'https', host, pathPrefix: '/join' })) }] },
    plugins: [...(config.plugins || []), 'expo-notifications', ...(branchKey && branchDomain ? [['@config-plugins/react-native-branch', { apiKey: branchKey, iosAppDomain: branchDomain, iosUniversalLinkDomains: domains }] as [string, Record<string, unknown>]] : [])],
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
  };
};
