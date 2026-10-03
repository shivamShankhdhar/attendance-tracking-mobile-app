import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { Palette } from '../constants/colors';
export interface AttendanceDateFieldProps { value: string; onChange: (value: string) => void; maximumDate: string; label: string }
export default function AttendanceDateField({ value, onChange, label }: AttendanceDateFieldProps) {
  return <TextInput accessibilityLabel={`${label}, YYYY-MM-DD`} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} autoCorrect={false} maxLength={10} style={styles.input} />;
}
const styles = StyleSheet.create({ input: { padding: 12, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, color: Palette.textPrimary, fontSize: 14 } });
