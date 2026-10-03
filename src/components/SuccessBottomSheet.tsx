import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { AdBanner } from './AdBanner';

interface SuccessBottomSheetProps {
  visible: boolean;
  title: string;
  message: string;
  badgeText?: string;
  buttonLabel?: string;
  onClose: () => void;
}

export const SuccessBottomSheet: React.FC<SuccessBottomSheetProps> = ({
  visible,
  title,
  message,
  badgeText = 'SECURITY ACTIVE',
  buttonLabel = 'Done',
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tap outside to dismiss */}
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheetCard}>
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Success Icon Circle */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="shield-check"
              size={36}
              color={Palette.brandPrimary}
            />
          </View>

          {/* Optional Badge */}
          {badgeText ? (
            <View style={styles.badgePill}>
              <Feather name="check" size={11} color={Palette.brandPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Primary Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            onPress={onClose}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
          </Pressable>

          <AdBanner position="bottom" safeBottom />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissArea: {
    flex: 1,
    width: '100%',
  },
  sheetCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 24,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D4E2BA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D4E2BA',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Palette.brandPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: Palette.brandPressed,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
