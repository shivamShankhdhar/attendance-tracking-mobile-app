import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';

export interface TimelineStepItem {
  title: string;
  subtitle?: string;
  time?: string;
  status: 'completed' | 'active' | 'pending' | 'rejected';
}

interface TimelineStepProps {
  steps: TimelineStepItem[];
}

export function TimelineStep({ steps }: TimelineStepProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        let dotBg: string = Palette.surfaceMuted;
        let iconColor: string = Palette.textSecondary;
        let iconName: keyof typeof Feather.glyphMap = 'circle';

        if (step.status === 'completed') {
          dotBg = Palette.successTint;
          iconColor = Palette.success;
          iconName = 'check';
        } else if (step.status === 'active') {
          dotBg = Palette.pendingTint;
          iconColor = Palette.pending;
          iconName = 'clock';
        } else if (step.status === 'rejected') {
          dotBg = Palette.dangerTint;
          iconColor = Palette.danger;
          iconName = 'x';
        }

        return (
          <View key={idx} style={styles.stepRow}>
            {/* Left indicator column */}
            <View style={styles.indicatorCol}>
              <View style={[styles.dot, { backgroundColor: dotBg }]}>
                <Feather name={iconName} size={13} color={iconColor} />
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Right content column */}
            <View style={[styles.contentCol, isLast && styles.contentLast]}>
              <View style={styles.titleRow}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                {step.time && <Text style={styles.stepTime}>{step.time}</Text>}
              </View>
              {step.subtitle && <Text style={styles.stepSubtitle}>{step.subtitle}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  stepRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Palette.border,
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  contentLast: {
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  stepTime: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  stepSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
