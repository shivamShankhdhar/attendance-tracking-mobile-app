import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SecondaryButton } from './Buttons';
import { Palette } from '../constants/colors';
export function QueryState({ query }: { query: { data: unknown; error: Error | null; fetchStatus: string; refetch: () => unknown } }) {
  if (query.error) return <View style={{ padding: 12, gap: 8 }}><Text style={{ color: Palette.danger }}>{query.data !== undefined ? 'Could not refresh. Showing previously loaded data. ' : ''}{query.error.message}</Text><SecondaryButton label="Try again" onPress={() => { query.refetch(); }} /></View>;
  if (query.data === undefined) return query.fetchStatus === 'paused' ? <Text>You&apos;re offline. Reconnect to load your data.</Text> : <ActivityIndicator style={{ padding: 16 }} color={Palette.brandPrimary} />;
  return null;
}
