import { formatFriendlyDate } from '../utils/attendance';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share, Switch, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { attendanceApi } from '../services/attendanceApi';
import { copyToClipboard } from '../utils/clipboard';
import { Palette } from '../constants/colors';
import { showError, showSuccess } from '../stores/alertStore';
import { AttendanceDataSkeleton } from './AttendanceDataSkeleton';
import { ExplorerTabs } from './AttendanceExplorer';
import { DetailRow, DetailSection } from './DetailPage';
import { WorkplaceJoinQrModal } from './WorkplaceJoinQrModal';


export function WorkplaceTab({ initialSection = 'Overview' }: { initialSection?: string } = {}) {
  const user = useAuthStore(state => state.user);
  const activeWorkplace = useAuthStore(state => state.activeWorkplace);
  const [section, setSection] = useState(initialSection);
  const [updatingHistoryVisibility, setUpdatingHistoryVisibility] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const workplaceId = activeWorkplace?.workplaceId || '';
  const employer = activeWorkplace?.role === 'EMPLOYER';
  const details = useQuery({ queryKey: ['workplace-details', user?.id, workplaceId], queryFn: () => attendanceApi.getWorkplaceDetails(workplaceId), enabled: !!user?.id && !!workplaceId, staleTime: 60_000 });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await details.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };
  const workplace = details.data;
  const name = workplace?.name || activeWorkplace?.workplaceName || 'Workplace';
  const firstName = user?.name.trim().split(/\s+/)[0] || 'User';
  const code = workplace?.code || activeWorkplace?.workplaceCode;
  const shareCode = async () => {
    if (!code) return;
    try {
      if (await copyToClipboard(code)) showSuccess('Workplace code copied.');
      else await Share.share({ message: `${name} workplace code: ${code}` });
    } catch { showError('Unable to share the workplace code.'); }
  };
  const setHistoryVisibility = async (nextVal: boolean) => {
    if (!employer || !workplaceId || updatingHistoryVisibility) return;
    setUpdatingHistoryVisibility(true);
    try {
      await attendanceApi.updateWorkplace(workplaceId, {
        attendanceSettings: {
          requireWifi: workplace?.attendanceSettings?.requireWifi || false,
          autoCloseHour: workplace?.attendanceSettings?.autoCloseHour ?? 23,
          allowEmployeeViewHistory: nextVal,
        },
      });
      await details.refetch();
      await useAuthStore.getState().refreshProfile();
      showSuccess(nextVal ? 'Attendance history is now visible to employees.' : 'Attendance history is now hidden from employees.');
    } catch {
      showError('Failed to update employee history visibility.');
    } finally {
      setUpdatingHistoryVisibility(false);
    }
  };

  return <View style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headingRow}><View style={styles.headingIcon}><Feather name="briefcase" size={23} color={Palette.brandPrimary} /></View><View style={styles.flex}><Text style={styles.caption}>WORKPLACE</Text><Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{name}</Text><Text style={styles.signedInAs}>Signed in as {firstName}</Text><Text style={styles.subtitle}>{employer ? 'Employer / Admin' : 'Team member'} · {workplace?.memberCount ?? activeWorkplace?.memberCount ?? '—'} active members</Text></View></View>
      <ExplorerTabs values={employer ? ['Overview', 'Invite'] : ['Overview']} selected={section} onSelect={setSection} variant="segmented" />
    </View>
    {section === 'Invite' && employer ? (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.brandPrimary}
            colors={[Palette.brandPrimary]}
          />
        }
      >
        <WorkplaceJoinQrModal key={workplaceId} embedded visible workplaceId={workplaceId} workplaceName={name} onClose={() => setSection('Overview')} onViewRequests={() => setSection('Overview')} />
      </ScrollView>
    ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.brandPrimary}
            colors={[Palette.brandPrimary]}
          />
        }
      >
      {!workplace && (details.isLoading || details.isFetching) ? (
        <AttendanceDataSkeleton variant="workplace" refreshing={false} />
      ) : details.isError && !workplace ? (
        <Pressable accessibilityRole="button" onPress={() => void details.refetch()} style={styles.retry}>
          <Text style={styles.error}>Couldn’t load current details. Tap to retry.</Text>
        </Pressable>
      ) : (
        <>
          {details.isError && (
            <Pressable accessibilityRole="button" onPress={() => void details.refetch()} style={styles.retry}>
              <Text style={styles.error}>Couldn’t refresh current details. Tap to retry.</Text>
            </Pressable>
          )}
          <DetailSection title="Workplace information">
            <DetailRow icon="hash" label="Workplace code" actionIcon="copy" actionLabel="Copy workplace code" value={code || 'Unavailable'} onPress={code ? () => void shareCode() : undefined} />
            <DetailRow icon="map-pin" label="Address" value={workplace?.address || activeWorkplace?.address || 'No address added'} />
            <DetailRow icon="users" label="Team size" value={`${workplace?.memberCount ?? activeWorkplace?.memberCount ?? '—'} active members`} />
            {workplace?.createdAt && <DetailRow icon="calendar" label="Created" value={formatFriendlyDate(workplace.createdAt, 'd MMM yyyy')} />}
            <DetailRow icon="shield" label="Your role" value={employer ? 'Employer / Admin' : 'Employee'} />
            {activeWorkplace?.employeeCode && <DetailRow icon="user" label="Employee ID" value={activeWorkplace.employeeCode} />}
          </DetailSection>
          {workplace && (
            <DetailSection title="Attendance setup">
              <DetailRow icon="wifi" label="Workplace Wi-Fi required" value={workplace.attendanceSettings?.requireWifi ? 'Yes' : 'No'} />
              <DetailRow icon="clock" label="Daily auto close" value={workplace.attendanceSettings?.autoCloseHour === 23 ? 'End of day' : `${String(workplace.attendanceSettings?.autoCloseHour ?? 23).padStart(2, '0')}:00 local time`} />
              <View style={styles.historySettingRow}>
                <Feather name="file-text" size={18} color={Palette.brandPrimary} />
                <View style={styles.historySettingText}>
                  <Text style={styles.historySettingLabel}>Employee history access</Text>
                  <Text style={styles.historySettingValue}>{workplace.attendanceSettings?.allowEmployeeViewHistory !== false ? 'Visible to employees' : 'Hidden from employees'}</Text>
                </View>
                <Switch
                  value={workplace.attendanceSettings?.allowEmployeeViewHistory !== false}
                  onValueChange={value => void setHistoryVisibility(value)}
                  disabled={!employer || updatingHistoryVisibility}
                  thumbColor={workplace.attendanceSettings?.allowEmployeeViewHistory !== false ? Palette.brandPrimary : '#64748B'}
                  trackColor={{ false: Palette.border, true: Palette.brandTint }}
                  ios_backgroundColor={Palette.border}
                  accessibilityLabel="Toggle employee history access"
                />
              </View>
            </DetailSection>
          )}
        </>
      )}
    </ScrollView>
    )}
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1 }, header: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: Palette.canvas }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16 }, headingIcon: { padding: 12, borderRadius: 16, backgroundColor: Palette.brandTint }, flex: { flex: 1, minWidth: 0 }, caption: { fontSize: 10, letterSpacing: 1.2, color: Palette.textSecondary, fontWeight: '700', marginBottom: 4 }, title: { fontSize: 22, fontWeight: '700', color: Palette.textPrimary }, signedInAs: { fontSize: 12, lineHeight: 17, fontWeight: '600', color: Palette.brandPrimary, marginTop: 2 }, subtitle: { fontSize: 12, lineHeight: 19, color: Palette.textSecondary }, content: { padding: 16, paddingBottom: 28, gap: 18 }, historySettingRow: { minHeight: 66, flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }, historySettingText: { flex: 1, gap: 3 }, historySettingLabel: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary }, historySettingValue: { fontSize: 13, color: Palette.textSecondary }, workplaceChoice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 16, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border }, selectedChoice: { borderColor: Palette.brandPrimary, backgroundColor: Palette.brandTint }, choiceName: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary }, retry: { padding: 14, backgroundColor: Palette.dangerTint, borderRadius: 12 }, error: { color: Palette.danger, fontSize: 13, lineHeight: 20 },
});
