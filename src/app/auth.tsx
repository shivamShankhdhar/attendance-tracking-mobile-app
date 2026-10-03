import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../stores/authStore';
import { showError } from '../stores/alertStore';
import { ProcessingScreen } from '../components/ProcessingScreen';
import { completeGoogleSignIn } from '../services/googleSignIn';
import { parseGoogleCallback } from '../utils/oauth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { id_token: token, error, error_description: description } = useLocalSearchParams<{ id_token?: string; error?: string; error_description?: string }>();
  const authenticated = useAuthStore(state => state.isAuthenticated);
  useEffect(() => {
    let mounted = true;
    const finish = async () => {
      try {
        if (!authenticated) {
          if (error) throw new Error(description || 'Google couldn’t complete sign-in. Please try again.');
          let idToken = token;
          if (!idToken) {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const result = parseGoogleCallback(initialUrl);
              if (result.error) throw new Error(result.errorDescription || result.error);
              idToken = result.idToken || undefined;
            }
          }
          if (!idToken) throw new Error('Sign-in details are missing. Please try again.');
          if (!mounted) return;
          await completeGoogleSignIn(idToken);
        }
      } catch (error) {
        if (mounted) showError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.', 'Sign-in failed');
      } finally {
        if (mounted) router.replace('/');
      }
    };
    void finish();
    return () => { mounted = false; };
  }, [token, error, description, authenticated, router]);
  return <ProcessingScreen title="Signing you in" subtitle="Checking your account and opening your workplace…" />;
}
