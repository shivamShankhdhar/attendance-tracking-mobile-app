import { formatFriendlyDate } from '../utils/attendance';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import type { JoinRequestState } from '../services/attendanceApi';

export function JoinStatusTracker({ request }: { request: JoinRequestState }) {
  const pending = request.status === 'PENDING';
  const approved = request.status === 'APPROVED';
  const rejected = request.status === 'REJECTED';
  const color = pending ? '#966515' : approved ? '#28734B' : Palette.danger;
  const label = pending ? 'Pending approval' : approved ? 'Approved' : rejected ? 'Not approved' : 'Request cancelled';
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <View style={styles.heading}><Text style={styles.title}>Your join request</Text><Text style={[styles.badge, { color }]}>{label}</Text></View>
    {[
      { title: 'Request sent', detail: formatFriendlyDate(request.requestedAt, 'd MMM yyyy · h:mm a'), complete: true, icon: 'check' as const },
      { title: 'Admin review', detail: pending ? 'Your workplace admin is reviewing your request.' : 'Review complete', complete: !pending, icon: pending ? 'clock' as const : 'check' as const },
      { title: pending ? 'Decision' : label, detail: pending ? 'We’ll update you when your admin responds.' : approved ? 'Your workplace is ready to open.' : rejected ? request.rejectionReason || 'Contact your workplace admin for clarification.' : 'You can use a new invitation to request access.', complete: !pending, icon: approved ? 'check' as const : 'x' as const },
    ].map((step, index) => <View key={index} style={styles.step}>
      <View style={styles.rail}><View style={[styles.dot, { backgroundColor: step.complete ? Palette.brandTint : Palette.canvas }]}><Feather name={step.icon} size={15} color={step.complete ? (index === 2 ? color : Palette.brandPrimary) : Palette.textSecondary} /></View>{index < 2 ? <View style={styles.line} /> : null}</View>
      <View style={styles.copy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.detail}>{step.detail}</Text></View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#fff', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: Palette.border }, heading: { gap: 8, marginBottom: 20 }, title: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary }, badge: { fontSize: 13, fontWeight: '700' }, step: { flexDirection: 'row', gap: 12 }, rail: { width: 30, alignItems: 'center' }, dot: { height: 30, width: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }, line: { width: 2, backgroundColor: Palette.border, flex: 1, minHeight: 18, marginVertical: 3 }, copy: { flex: 1, paddingBottom: 20, paddingTop: 4 }, stepTitle: { fontSize: 14, fontWeight: '600', color: Palette.textPrimary }, detail: { fontSize: 13, color: Palette.textSecondary, lineHeight: 19, marginTop: 3 } });
