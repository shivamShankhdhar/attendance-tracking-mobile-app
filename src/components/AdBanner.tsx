import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { ADMOB_CONFIG } from '../constants/ads';

let BannerAd: any = null;
let BannerAdSize: any = null;
let mobileAds: any = null;

try {
  const adsModule = require('react-native-google-mobile-ads');
  BannerAd = adsModule.BannerAd;
  BannerAdSize = adsModule.BannerAdSize;
  mobileAds = adsModule.default || adsModule.MobileAds;
} catch {
  // Native module not linked (e.g. unit tests or unsupported environment)
}

let isInitialized = false;
function ensureMobileAdsInitialized() {
  if (isInitialized || !mobileAds) return;
  try {
    const instance = typeof mobileAds === 'function' ? mobileAds() : mobileAds;
    if (instance && typeof instance.initialize === 'function') {
      isInitialized = true;
      instance.initialize().catch(() => {});
    }
  } catch {}
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
  position?: 'bottom' | 'inline';
  variant?: 'docked' | 'card';
  safeBottom?: boolean;
}

export function AdBanner({ style, position = 'bottom', variant = 'docked', safeBottom = false }: AdBannerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    ensureMobileAdsInitialized();
  }, []);

  // If native module is not linked or unavailable, consume zero space
  if (!BannerAd) {
    return null;
  }

  // If loading failed, consume zero space (never occupy empty height)
  if (loadFailed) {
    return null;
  }

  const isBottom = position === 'bottom';
  const isCard = variant === 'card';
  // Exact height for anchored adaptive banners on modern mobile displays (>=720dp is 60dp, <=720dp is 50dp)
  const adHeight = windowHeight > 720 ? 60 : 50;
  // Comfortable gap from bottom edge when safeBottom is requested
  const bottomOffset = isBottom && safeBottom ? (insets.bottom > 0 ? Math.min(insets.bottom, 16) : 10) : 0;
  const slotHeight = isBottom ? adHeight + bottomOffset : adHeight;

  const adSize = isCard
    ? BannerAdSize?.BANNER || 'BANNER'
    : BannerAdSize?.ANCHORED_ADAPTIVE_BANNER || BannerAdSize?.BANNER || 'ANCHORED_ADAPTIVE_BANNER';

  return (
    <View
      style={[
        isLoaded
          ? isCard
            ? [styles.cardSlot, { height: adHeight, minHeight: adHeight }, style]
            : isBottom
            ? [styles.bottomSlot, { height: slotHeight, minHeight: slotHeight, paddingBottom: bottomOffset }, style]
            : [styles.inlineLoaded, style]
          : styles.hidden,
      ]}
      accessibilityRole="none"
      accessibilityLabel="Advertisement"
    >
      <BannerAd
        unitId={ADMOB_CONFIG.BANNER_ID}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setIsLoaded(true);
          setLoadFailed(false);
        }}
        onAdFailedToLoad={() => {
          setIsLoaded(false);
          setLoadFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#F2F5E8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8D5',
    overflow: 'hidden',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  cardSlot: {
    width: '100%',
    maxWidth: 360,
    height: 58,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6D8',
    backgroundColor: '#FAFAF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  inlineLoaded: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  hidden: {
    width: '100%',
    height: 0,
    maxHeight: 0,
    overflow: 'hidden',
    opacity: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
  },
});

