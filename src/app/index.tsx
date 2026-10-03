import { Redirect, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { clearPendingJoin, getPendingJoin } from '../services/workplaceLinks';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { PinLoginScreen } from '../screens/PinLoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { WorkplaceSelectScreen } from '../screens/WorkplaceSelectScreen';
import { EmployerDashboard, type EmployerNavTab } from '../screens/EmployerDashboard';
import { EmployeeDashboard } from '../screens/EmployeeDashboard';
import { MpinSetupScreen } from '../screens/MpinSetupScreen';
import { SecuritySettingsScreen } from '../screens/SecuritySettingsScreen';
import { ReviewerLoginScreen } from '../screens/ReviewerLoginScreen';
import { useLockStore } from '../stores/lockStore';
import { getCachedHasSeenWelcome } from '../services/bootService';
import { setHasSeenWelcome } from '../services/storage';
import { useTheme } from '../hooks/use-theme';

function SignedOut({ hasSeenWelcome }: { hasSeenWelcome: boolean }) {
  const pendingPinApproval = useAuthStore(state => state.pendingPinApproval);
  const [pinLogin, setPinLogin] = useState(!!pendingPinApproval);
  const [showWelcome, setShowWelcome] = useState(!hasSeenWelcome);
  const [reviewerLogin, setReviewerLogin] = useState(false);
  useTheme();

  if (reviewerLogin) {
    return <ReviewerLoginScreen key="reviewer-login" onBack={() => setReviewerLogin(false)} />;
  }

  if (pinLogin) {
    return <PinLoginScreen key="pin-login" onBack={() => setPinLogin(false)} />;
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        key="welcome-intro"
        onGetStarted={() => {
          setShowWelcome(false);
          void setHasSeenWelcome(true).catch(() => {});
        }}
        onNavigateToReviewer={() => setReviewerLogin(true)}
      />
    );
  }

  return (
    <SignInScreen
      key="sign-in-screen"
      onNavigateToPinLogin={() => setPinLogin(true)}
      onNavigateToReviewer={() => setReviewerLogin(true)}
    />
  );
}

export default function AppEntry() {
  const { palette } = useTheme();
  void palette; // keep theme subscription active

  // pendingJoin: fetch in background — do NOT block render while waiting
  const { data: pendingJoin, refetch: refreshPendingJoin } = useQuery({
    queryKey: ['pending-join'],
    queryFn: () => getPendingJoin().catch(() => null),
    staleTime: Infinity,
    // Start fetching immediately but don't gate the render on it
    enabled: true,
  });
  useFocusEffect(useCallback(() => { void refreshPendingJoin(); }, [refreshPendingJoin]));

  // hasSeenWelcome: pre-fetched by bootService — no async needed here
  const [hasSeenWelcome] = useState<boolean>(() => getCachedHasSeenWelcome());

  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [employerNavigation, setEmployerNavigation] = useState<{ userId?: string; tab: EmployerNavTab }>({ tab: 'today' });
  const rememberEmployerTab = useCallback((tab: EmployerNavTab) => {
    setEmployerNavigation(previous =>
      previous.userId === user?.id && previous.tab === tab ? previous : { userId: user?.id, tab }
    );
  }, [user?.id]);
  const workplace = useAuthStore((s) => s.activeWorkplace);
  const memberships = useAuthStore((s) => s.memberships);
  const isWorkplaceConfirmed = useAuthStore((s) => s.isWorkplaceConfirmed);
  const onboardingStep = useAuthStore((s) => s.onboardingInitialStep);
  const isLoading = useAuthStore((s) => s.isLoading);

  const hasMpin = useLockStore((s) => s.hasMpin);
  const isResettingMpinAfterRelogin = useLockStore((s) => s.isResettingMpinAfterRelogin);
  const setIsResettingMpinAfterRelogin = useLockStore((s) => s.setIsResettingMpinAfterRelogin);
  const isSetupDismissed = useLockStore((s) => s.isSetupDismissed);
  const shouldPromptSetupAfterSignIn = useLockStore((s) => s.shouldPromptSetupAfterSignIn);
  const showSecuritySettings = useLockStore((s) => s.showSecuritySettings);
  const closeSecuritySettings = useLockStore((s) => s.closeSecuritySettings);
  const dismissSetup = useLockStore((s) => s.dismissSetup);

  const isEmployer = memberships.some((m) => m.role === 'EMPLOYER');

  useEffect(() => {
    if (authenticated && isEmployer && pendingJoin) {
      void clearPendingJoin();
    }
  }, [authenticated, isEmployer, pendingJoin]);

  // ── Unauthenticated: render immediately — no splashing ──────────────────
  if (!authenticated) {
    // pendingJoin might still be loading — that's fine. We only use it to
    // skip the welcome screen; if it's not here yet we'll show welcome
    // normally and redirect via the JoinIntegrations monitor once it resolves.
    return (
      <SignedOut
        hasSeenWelcome={hasSeenWelcome || Boolean(pendingJoin)}
      />
    );
  }

  // A background refresh is happening (e.g. after login) — minimal block
  if (isLoading) {
    // Don't show a full processing screen; just render nothing briefly.
    // The dashboard will appear as soon as isLoading flips false.
    return null;
  }

  if (pendingJoin && !isEmployer && !isResettingMpinAfterRelogin) {
    return <Redirect href={{ pathname: '/join', params: { token: pendingJoin } }} />;
  }

  if (isResettingMpinAfterRelogin) {
    return (
      <MpinSetupScreen
        key="mpin-reset-flow"
        isResetMode={true}
        allowDismiss={false}
        onSuccess={() => {
          setIsResettingMpinAfterRelogin(false);
        }}
      />
    );
  }

  if (showSecuritySettings) {
    return (
      <SecuritySettingsScreen
        key="security-settings-screen"
        onBack={closeSecuritySettings}
      />
    );
  }

  if (!hasMpin && shouldPromptSetupAfterSignIn && !isSetupDismissed) {
    return (
      <MpinSetupScreen
        key="mpin-setup-prompt"
        allowDismiss={true}
        onDismiss={dismissSetup}
        onSuccess={() => {}}
      />
    );
  }

  const activeMemberships = memberships.filter((m) => m.status === 'ACTIVE');
  const needsSelection = activeMemberships.length > 1 && !isWorkplaceConfirmed;

  if (needsSelection) {
    return <WorkplaceSelectScreen />;
  }

  if (!workplace) {
    return <OnboardingScreen initialStep={onboardingStep} />;
  }

  if (workplace.role === 'EMPLOYER') {
    return (
      <EmployerDashboard
        key={`${user?.id}:${workplace.id}`}
        initialTab={employerNavigation.userId === user?.id ? employerNavigation.tab : 'today'}
        onTabChange={rememberEmployerTab}
      />
    );
  }

  return <EmployeeDashboard key={`${user?.id}:${workplace.id}`} />;
}
