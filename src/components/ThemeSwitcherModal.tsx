import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { Palette } from '../constants/colors';
import { ThemeMode } from '../stores/themeStore';
import { AdBanner } from './AdBanner';

interface ThemeSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSwitcherModal({ visible, onClose }: ThemeSwitcherModalProps) {
  const { themeMode, isDark, setThemeMode, palette } = useTheme();

  const [mounted, setMounted] = useState(visible);
  const [applyingText, setApplyingText] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          mass: 0.8,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  };

  const handleSelectMode = async (mode: ThemeMode) => {
    if (mode === themeMode) {
      handleDismiss();
      return;
    }
    const label = mode === 'dark' ? 'Dark Theme' : mode === 'light' ? 'Light Theme' : 'System Theme';
    setApplyingText(`Applying ${label}…`);
    await setThemeMode(mode);
    setTimeout(() => {
      setApplyingText(null);
      handleDismiss();
    }, 280);
  };

  const options: Array<{
    mode: ThemeMode;
    label: string;
    description: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    badge?: string;
  }> = [
    {
      mode: 'light',
      label: 'Light Theme',
      description: 'Clean crisp white canvas with classic olive green styling.',
      icon: 'sun',
      badge: 'Active',
    },
  ];

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Fast static overlay that does not slide */}
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal sheet that slides from bottom to top */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: palette.canvas, borderBottomColor: palette.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: palette.brandTint }]}>
                <Feather name="moon" size={17} color={palette.brandPrimary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>App Theme</Text>
                <Text style={[styles.headerSub, { color: palette.textSecondary }]}>Choose your visual style</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close theme switcher"
              onPress={handleDismiss}
              hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Feather name="x" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>

          {/* Applying theme feedback banner */}
          {applyingText ? (
            <View style={[styles.applyingBar, { backgroundColor: palette.brandTint, borderColor: palette.brandPrimary }]}>
              <ActivityIndicator size="small" color={palette.brandPrimary} />
              <Text style={[styles.applyingBarText, { color: palette.brandPrimary }]}>{applyingText}</Text>
            </View>
          ) : null}

          {/* Options List */}
          <View style={styles.optionsList}>
            {options.map((item) => {
              const isSelected = themeMode === item.mode;
              return (
                <Pressable
                  key={item.mode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={item.label}
                  onPress={() => void handleSelectMode(item.mode)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? palette.brandTint : palette.surfaceMuted,
                      borderColor: isSelected ? palette.brandPrimary : palette.border,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Feather
                      name={item.icon}
                      size={20}
                      color={isSelected ? palette.brandPrimary : palette.textSecondary}
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[
                          styles.label,
                          { color: palette.textPrimary },
                          isSelected && { color: palette.brandPrimary, fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View style={[styles.badge, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                          <Text style={[styles.badgeText, { color: palette.textSecondary }]}>
                            {item.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.desc, { color: palette.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: isSelected ? palette.brandPrimary : palette.border },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioDot, { backgroundColor: palette.brandPrimary }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <AdBanner position="bottom" safeBottom />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 13, 8, 0.55)',
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionsList: {
    padding: 18,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  applyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  applyingBarText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
