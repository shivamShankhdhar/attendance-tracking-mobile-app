import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';

interface DateSwitcherProps {
  unit?: 'day' | 'month';
  currentDate: string; // Formatted date string, e.g. "Mon, Sep 28"
  isToday?: boolean;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onResetToday?: () => void;
  badgeText?: string | null;
}

export function DateSwitcher({
  currentDate,
  unit = 'day',
  isToday = true,
  onPrevDay,
  onNextDay,
  onResetToday,
  badgeText,
}: DateSwitcherProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Previous ${unit}`}
        onPress={onPrevDay}
        disabled={!onPrevDay}
        style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowPressed]}
      >
        <Feather name="chevron-left" size={20} color={Palette.textPrimary} />
      </Pressable>

      <Pressable style={styles.centerContainer} accessibilityRole="button" accessibilityLabel={onResetToday ? "Return to today" : currentDate} disabled={!onResetToday} onPress={onResetToday}>
        <View style={styles.dateRow}>
          <Feather name="calendar" size={15} color={Palette.brandPrimary} style={styles.calendarIcon} />
          <Text style={styles.dateText}>{currentDate}</Text>
        </View>
        {isToday && badgeText !== null && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayText}>{badgeText || 'Today'}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Next ${unit}`}
        onPress={onNextDay}
        disabled={isToday || !onNextDay}
        style={({ pressed }) => [
          styles.arrowBtn,
          isToday && styles.arrowDisabled,
          pressed && !isToday && styles.arrowPressed,
        ]}
      >
        <Feather
          name="chevron-right"
          size={20}
          color={isToday ? Palette.border : Palette.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPressed: {
    backgroundColor: Palette.surfaceMuted,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  centerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarIcon: {
    marginRight: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  todayBadge: {
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: DesignTokens.radius.full,
  },
  todayText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.brandPressed,
  },
});
