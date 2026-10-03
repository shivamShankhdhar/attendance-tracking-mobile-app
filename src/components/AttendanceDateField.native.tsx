import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Palette } from '../constants/colors';
interface Props { value: string; onChange: (value: string) => void; maximumDate: string; label: string }
const asDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); };
export default function AttendanceDateField({ value, onChange, maximumDate, label }: Props) {
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label}`} onPress={() => setOpen(value => !value)} style={styles.input}><Text style={styles.text}>{value} ▾</Text></Pressable>
    {open && <DateTimePicker value={asDate(value)} maximumDate={asDate(maximumDate)} mode="date" accentColor={Palette.brandPrimary} onDismiss={() => setOpen(false)} onValueChange={(_, date) => {
      onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      setOpen(false);
    }} />}
  </View>;
}
const styles = StyleSheet.create({ input: { padding: 12, borderWidth: 1, borderColor: Palette.border, borderRadius: 12 }, text: { color: Palette.textPrimary, fontSize: 14 } });
