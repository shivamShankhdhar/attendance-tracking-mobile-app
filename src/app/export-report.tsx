import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ExportReportScreen } from '../screens/ExportReportScreen';
import { useAuthStore } from '../stores/authStore';

export default function ExportReportRoute() {
  const router = useRouter();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const activeWorkplace = useAuthStore((s) => s.activeWorkplace);

  const params = useLocalSearchParams<{
    workplaceId?: string;
    workplaceName?: string;
    month?: string;
    startDate?: string; endDate?: string; status?: string; employeeMemberId?: string;
  }>();

  if (!authenticated) {
    return <Redirect href="/" />;
  }

  const effectiveWorkplaceId = params.workplaceId || activeWorkplace?.workplaceId || '';
  const effectiveWorkplaceName = params.workplaceName || activeWorkplace?.workplaceName || 'Workplace';

  return (
    <ExportReportScreen
      workplaceId={effectiveWorkplaceId}
      workplaceName={effectiveWorkplaceName}
      initialMonth={params.month}
      initialStartDate={params.startDate}
      initialEndDate={params.endDate}
      initialStatus={params.status}
      initialEmployeeMemberId={params.employeeMemberId}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
    />
  );
}
