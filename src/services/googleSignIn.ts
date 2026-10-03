import { useAuthStore } from '../stores/authStore';

let pending: { token: string; promise: Promise<void> } | undefined;
/** The browser result and deep-link route can deliver the same token together. */
export function completeGoogleSignIn(token: string): Promise<void> {
  if (pending) {
    return pending.token === token ? pending.promise : Promise.reject(new Error('Another sign-in is already in progress.'));
  }
  const promise = Promise.resolve().then(() => useAuthStore.getState().loginWithGoogle(token)).finally(() => {
    if (pending?.promise === promise) pending = undefined;
  });
  pending = { token, promise };
  return promise;
}
