import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
const subscribe = (callback: () => void) => {
  const listener = AppState.addEventListener('change', callback);
  return () => listener.remove();
};
export function useForeground() {
  return useSyncExternalStore(subscribe, () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive', () => true);
}
