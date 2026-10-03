import React, { useEffect } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

export interface BarcodeBounds {
  origin: { x: number; y: number };
  size: { width: number; height: number };
}

interface QRScannerBoundingBoxProps {
  /** If the camera is currently actively looking for codes */
  active?: boolean;
  /** Barcode bounds returned from onBarcodeScanned ({ origin, size }) */
  bounds?: BarcodeBounds | null;
  /** True when a valid attendance QR is parsed and locked */
  locked?: boolean;
  /** Color theme accent for the brackets and scanner laser (default: cyan/teal) */
  accentColor?: string;
  /** Default frame size when no barcode is actively detected (default: 230) */
  defaultSize?: number;
}

/**
 * QR Scanner Bounding Box inspired by Catalin Miron's
 * "QR Code Scanner Bounding Box" (AnimateReactNative.com).
 *
 * Smoothly springs bounding box coordinates and size to match detected QR code
 * in real-time, renders corner brackets that hug the barcode edges, and sweeps
 * an animated laser beam across the reticle.
 */
export const QRScannerBoundingBox: React.FC<QRScannerBoundingBoxProps> = ({
  active = true,
  bounds = null,
  locked = false,
  accentColor = '#06B6D4',
  defaultSize = 230,
}) => {
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  // Animated values for the bounding box
  const boxX = useSharedValue(0);
  const boxY = useSharedValue(0);
  const boxW = useSharedValue(defaultSize);
  const boxH = useSharedValue(defaultSize);
  const laserY = useSharedValue(0);
  const lockedProgress = useSharedValue(0);

  // Sweep laser animation
  useEffect(() => {
    if (active && !locked) {
      laserY.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      laserY.value = 0.5;
    }
  }, [active, locked]);

  // Spring to target bounds or center default frame
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    if (bounds && bounds.size.width > 20 && bounds.size.height > 20) {
      // Barcode detected: smoothly spring to barcode bounds
      boxX.value = withSpring(Math.max(10, bounds.origin.x), { damping: 18, stiffness: 120 });
      boxY.value = withSpring(Math.max(10, bounds.origin.y), { damping: 18, stiffness: 120 });
      boxW.value = withSpring(Math.min(containerSize.width - 20, bounds.size.width), { damping: 18, stiffness: 120 });
      boxH.value = withSpring(Math.min(containerSize.height - 20, bounds.size.height), { damping: 18, stiffness: 120 });
    } else {
      // Default: center within the viewfinder
      const centerX = (containerSize.width - defaultSize) / 2;
      const centerY = (containerSize.height - defaultSize) / 2;
      boxX.value = withSpring(centerX, { damping: 20, stiffness: 90 });
      boxY.value = withSpring(centerY, { damping: 20, stiffness: 90 });
      boxW.value = withSpring(defaultSize, { damping: 20, stiffness: 90 });
      boxH.value = withSpring(defaultSize, { damping: 20, stiffness: 90 });
    }
  }, [bounds, containerSize, defaultSize]);

  // Locked / Success transition
  useEffect(() => {
    lockedProgress.value = withTiming(locked ? 1 : 0, { duration: 250 });
  }, [locked]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const animatedBoxStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: boxX.value,
      top: boxY.value,
      width: boxW.value,
      height: boxH.value,
    };
  });

  const animatedLaserStyle = useAnimatedStyle(() => {
    const topPos = laserY.value * (boxH.value - 4);
    const laserColor = interpolateColor(
      lockedProgress.value,
      [0, 1],
      [accentColor, '#10B981']
    );
    return {
      position: 'absolute',
      left: 12,
      right: 12,
      top: topPos,
      backgroundColor: laserColor,
      shadowColor: laserColor,
      shadowOpacity: 0.85,
      shadowRadius: 6,
      opacity: active ? 1 : 0,
    };
  });

  const animatedBracketStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      lockedProgress.value,
      [0, 1],
      ['#FFFFFF', '#10B981']
    );
    return {
      borderColor,
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {containerSize.width > 0 && (
        <Animated.View style={animatedBoxStyle}>
          {/* 4 Corner Brackets hugging bounding box */}
          <Animated.View style={[styles.corner, styles.topLeft, animatedBracketStyle]} />
          <Animated.View style={[styles.corner, styles.topRight, animatedBracketStyle]} />
          <Animated.View style={[styles.corner, styles.bottomLeft, animatedBracketStyle]} />
          <Animated.View style={[styles.corner, styles.bottomRight, animatedBracketStyle]} />

          {/* Sweeping Laser Beam */}
          <Animated.View style={[styles.laser, animatedLaserStyle]} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 10,
  },
  laser: {
    height: 3,
    borderRadius: 2,
    elevation: 4,
  },
});
