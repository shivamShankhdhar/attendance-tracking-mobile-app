import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { savePendingJoin } from '../../services/workplaceLinks';
import { useQueryClient } from '@tanstack/react-query';
import JoinWorkplaceRoute from './index';

/**
 * Entry point for deep links: bizora://join/<TOKEN> and
 * https://bizora.app/join/<TOKEN>
 *
 * Expo Router exposes the dynamic segment as params.token via
 * useLocalSearchParams, so the join screen would work even without
 * this wrapper. However, we explicitly persist the token to
 * AsyncStorage here so it survives an unauthenticated redirect to
 * sign-in and is picked up when the user returns to /join.
 */
export default function JoinTokenRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const client = useQueryClient();

  useEffect(() => {
    if (typeof token !== 'string' || !token) return;
    void savePendingJoin(token).then(() => {
      client.setQueryData(['pending-join'], token);
      // Replace so the user can't "back" into the bare /join/TOKEN url.
      router.replace({ pathname: '/join', params: { token } });
    });
  // Run once on mount — token from the URL won't change mid-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the join screen immediately while the async save + redirect
  // happens in the background. This avoids a blank flash.
  return <JoinWorkplaceRoute />;
}
