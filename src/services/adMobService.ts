import { Platform, AppState, AppStateStatus } from 'react-native';
import { ADMOB_CONFIG } from '../constants/ads';
import { useLockStore } from '../stores/lockStore';
import { useAuthStore } from '../stores/authStore';

// Safe dynamic imports of Google Mobile Ads to avoid crashing on web / tests
let AppOpenAd: any = null;
let InterstitialAd: any = null;
let RewardedInterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;

try {
  const gma = require('react-native-google-mobile-ads');
  AppOpenAd = gma.AppOpenAd;
  InterstitialAd = gma.InterstitialAd;
  RewardedInterstitialAd = gma.RewardedInterstitialAd || gma.RewardedAd;
  RewardedAd = gma.RewardedAd || gma.RewardedInterstitialAd;
  AdEventType = gma.AdEventType;
  RewardedAdEventType = gma.RewardedAdEventType;
} catch {
  // Native SDK unavailable (Web, Expo Go, or test runners)
}

/** Minimum interval between App Open ads (4 minutes) */
const MIN_APP_OPEN_INTERVAL_MS = 4 * 60 * 1000;

/** Probability of showing an App Open ad on eligible resume (~35% random chance) */
const APP_OPEN_TRIGGER_PROBABILITY = 0.35;

/** Minimum interval between standard Interstitial ads (60 seconds) to avoid spamming the user */
const MIN_INTERSTITIAL_INTERVAL_MS = 60 * 1000;

/** Max time to wait for a loading rewarded ad when the user taps Export (4.5 seconds) */
const REWARDED_AD_WAIT_TIMEOUT_MS = 4500;

/** Max time to wait for a loading video ad when enabling App Lock (4.5 seconds) */
const VIDEO_AD_WAIT_TIMEOUT_MS = 4500;

class AdMobService {
  // App Open Ad state
  private appOpenAdInstance: any = null;
  private isAppOpenAdLoaded = false;
  private isAppOpenLoading = false;
  private lastAppOpenAdTime = 0;
  private isShowingFullScreenAd = false;
  private isAppOpenSuppressed = false;
  private appStateListenerAttached = false;
  private lastAppState: AppStateStatus = 'active';

  // Interstitial Ad state (Prioritizing Text/Image/Media interstitials for higher fill and revenue)
  private interstitialAdInstance: any = null;
  private isInterstitialLoaded = false;
  private isInterstitialLoading = false;
  private lastInterstitialTime = 0;
  private activeInterstitialAdUnitId: string = ADMOB_CONFIG.INTERSTITIAL_MEDIA_ID;
  private interstitialWaiters: Array<(loaded: boolean) => void> = [];
  private interstitialRetryTimer: any = null;

  // Video Interstitial Ad state (Used specifically for high-intent actions like enabling App Lock)
  private videoAdInstance: any = null;
  private isVideoAdLoaded = false;
  private isVideoAdLoading = false;
  private isShowingVideoAd = false;
  private videoAdWaiters: Array<(loaded: boolean) => void> = [];
  private videoAdRetryTimer: any = null;

  // Rewarded Ad state for Export (Strong, resilient rewarded ad system)
  private rewardedAdInstance: any = null;
  private isRewardedAdLoaded = false;
  private isRewardedLoading = false;
  private isShowingRewardedAd = false;
  private rewardedWaiters: Array<(loaded: boolean) => void> = [];
  private rewardedRetryTimer: any = null;

  // -------------------------------------------------------------
  // APP OPEN ADS (Randomized & Frequency Capped)
  // -------------------------------------------------------------

  /**
   * Initialize App Open ads with smart randomized triggering on app resume
   */
  public initAppOpenAds(): void {
    if (Platform.OS === 'web' || !AppOpenAd || this.appStateListenerAttached) {
      return;
    }

    this.appStateListenerAttached = true;
    this.lastAppState = AppState.currentState;

    // Preload ads in the background on app start
    this.preloadAppOpenAd();
    this.preloadInterstitialAd(true); // Preload Text/Image/Media interstitial
    this.preloadVideoAd(); // Preload Video ad for app lock setup
    this.preloadRewardedAd(); // Preload Rewarded ad early for instant export

    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const isComingToForeground =
        (this.lastAppState === 'background' || this.lastAppState === 'inactive') &&
        nextState === 'active';

      this.lastAppState = nextState;

      if (isComingToForeground) {
        this.evaluateAndShowAppOpenAd();
      }
    });
  }

  /**
   * Preload an App Open ad in the background
   */
  public preloadAppOpenAd(): void {
    if (Platform.OS === 'web' || !AppOpenAd || this.isAppOpenLoading || this.isAppOpenAdLoaded) {
      return;
    }

    try {
      this.isAppOpenLoading = true;
      const ad = AppOpenAd.createForAdRequest(ADMOB_CONFIG.APP_OPEN_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        this.appOpenAdInstance = ad;
        this.isAppOpenAdLoaded = true;
        this.isAppOpenLoading = false;
        unsubLoaded?.();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        this.appOpenAdInstance = null;
        this.isAppOpenAdLoaded = false;
        this.isAppOpenLoading = false;
        unsubError?.();
      });

      ad.load();
    } catch {
      this.isAppOpenLoading = false;
      this.isAppOpenAdLoaded = false;
    }
  }

  /**
   * Evaluates conditions and randomly shows the App Open ad if conditions match:
   * 1. Minimum cooldown elapsed (4 minutes)
   * 2. Random probability check passes (~35% chance, not every time)
   * 3. App is NOT currently displaying MPIN lock or biometric prompt
   * 4. User is authenticated and not on temporary modal / scanner
   */
  private evaluateAndShowAppOpenAd(): void {
    if (this.isAppOpenSuppressed || this.isShowingFullScreenAd) {
      return;
    }

    // Do not disrupt MPIN app lock screen
    const isAppLocked = useLockStore.getState().isLocked;
    if (isAppLocked) {
      return;
    }

    // Do not show on unauthenticated screen (sign in / welcome)
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      return;
    }

    const now = Date.now();
    const timeSinceLastAd = now - this.lastAppOpenAdTime;

    // Check minimum interval
    if (timeSinceLastAd < MIN_APP_OPEN_INTERVAL_MS) {
      return;
    }

    // Random check: show occasionally on random app opens, not every single time
    const randomRoll = Math.random();
    if (randomRoll > APP_OPEN_TRIGGER_PROBABILITY) {
      // Skipped this time; ensure next ad is ready for future eligible open
      if (!this.isAppOpenAdLoaded && !this.isAppOpenLoading) {
        this.preloadAppOpenAd();
      }
      return;
    }

    // Show loaded ad
    if (this.isAppOpenAdLoaded && this.appOpenAdInstance) {
      const ad = this.appOpenAdInstance;
      this.appOpenAdInstance = null;
      this.isAppOpenAdLoaded = false;
      this.isShowingFullScreenAd = true;

      const cleanup = () => {
        this.isShowingFullScreenAd = false;
        this.lastAppOpenAdTime = Date.now();
        // Preload next App Open ad after this one completes
        setTimeout(() => this.preloadAppOpenAd(), 2000);
      };

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        unsubClosed?.();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
        unsubError?.();
      });

      try {
        ad.show();
      } catch {
        cleanup();
      }
    } else {
      // If ad was not ready, trigger a background preload for next time
      this.preloadAppOpenAd();
    }
  }

  /**
   * Temporarily suppress App Open ads (e.g. during camera scanning, export operations, or modal flows)
   */
  public setAppOpenAdSuppressed(suppressed: boolean): void {
    this.isAppOpenSuppressed = suppressed;
  }

  // -------------------------------------------------------------
  // INTERSTITIAL ADS (Optimized: Text & Image / Media Interstitials)
  // -------------------------------------------------------------

  /**
   * Preload an Interstitial Ad.
   * By default, preferMedia is TRUE, requesting Text/Image/Media interstitials
   * (ca-app-pub-1113302487630583/6411058695).
   * Text & Image interstitials load instantly, have higher fill rate, zero buffering
   * drop-off, and increase total impressions and revenue compared to heavy video interstitials.
   */
  public preloadInterstitialAd(preferMedia = true): void {
    if (Platform.OS === 'web' || !InterstitialAd || this.isInterstitialLoading || this.isInterstitialLoaded) {
      return;
    }

    const adUnitId = preferMedia
      ? ADMOB_CONFIG.INTERSTITIAL_MEDIA_ID
      : ADMOB_CONFIG.INTERSTITIAL_VIDEO_ID;

    this.activeInterstitialAdUnitId = adUnitId;

    try {
      this.isInterstitialLoading = true;
      const ad = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialAdInstance = ad;
        this.isInterstitialLoaded = true;
        this.isInterstitialLoading = false;
        unsubLoaded?.();

        // Notify any pending waiters
        const waiters = this.interstitialWaiters;
        this.interstitialWaiters = [];
        waiters.forEach((cb) => cb(true));
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        this.interstitialAdInstance = null;
        this.isInterstitialLoaded = false;
        this.isInterstitialLoading = false;
        unsubError?.();

        const waiters = this.interstitialWaiters;
        this.interstitialWaiters = [];
        waiters.forEach((cb) => cb(false));

        // Retry preload with backoff if not already scheduled
        if (!this.interstitialRetryTimer) {
          this.interstitialRetryTimer = setTimeout(() => {
            this.interstitialRetryTimer = null;
            this.preloadInterstitialAd(preferMedia);
          }, 8000);
        }
      });

      ad.load();
    } catch {
      this.isInterstitialLoading = false;
      this.isInterstitialLoaded = false;
    }
  }

  /**
   * Show an Interstitial Ad at natural navigation transition points
   * (e.g., entering workplace, switching workplace, or after an action).
   * Enforces:
   * - 60s minimum interval cooldown
   * - No disruption during MPIN lock
   * - No disruption when unauthenticated
   * - No collision with active full screen or rewarded ads
   * - Returns boolean indicating if ad was displayed
   */
  public async showInterstitial(_context?: string): Promise<boolean> {
    if (Platform.OS === 'web' || !InterstitialAd) {
      return false;
    }

    // Safeguard checks: do not interrupt user during lock or sensitive states
    if (this.isShowingFullScreenAd || this.isShowingRewardedAd || this.isShowingVideoAd || this.isAppOpenSuppressed) {
      return false;
    }

    const isAppLocked = useLockStore.getState().isLocked;
    if (isAppLocked) {
      return false;
    }

    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      return false;
    }

    // Check frequency cooldown (60 seconds)
    const now = Date.now();
    if (now - this.lastInterstitialTime < MIN_INTERSTITIAL_INTERVAL_MS) {
      // Cooldown active, ensure ad is loaded for later
      if (!this.isInterstitialLoaded && !this.isInterstitialLoading) {
        this.preloadInterstitialAd(true);
      }
      return false;
    }

    // If ad is not loaded yet, initiate background preload and do not block the user
    if (!this.isInterstitialLoaded || !this.interstitialAdInstance) {
      this.preloadInterstitialAd(true);
      return false;
    }

    const ad = this.interstitialAdInstance;
    this.interstitialAdInstance = null;
    this.isInterstitialLoaded = false;
    this.isShowingFullScreenAd = true;
    this.lastInterstitialTime = Date.now();
    this.setAppOpenAdSuppressed(true);

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.isShowingFullScreenAd = false;
        this.setAppOpenAdSuppressed(false);
        // Preload next text/image/media interstitial in background after 2 seconds
        setTimeout(() => this.preloadInterstitialAd(true), 2000);
        resolve(true);
      };

      const timer = setTimeout(finish, 20000); // 20s safety timeout

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        clearTimeout(timer);
        unsubClosed?.();
        finish();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        clearTimeout(timer);
        unsubError?.();
        finish();
      });

      try {
        ad.show();
      } catch {
        clearTimeout(timer);
        finish();
      }
    });
  }

  // -------------------------------------------------------------
  // VIDEO ADS (Used specifically for Enabling App Lock in Settings)
  // -------------------------------------------------------------

  /**
   * Preload a Video Interstitial Ad (ca-app-pub-1113302487630583/4255754368).
   * Specifically preloaded for enabling App Lock in settings.
   */
  public preloadVideoAd(): void {
    if (Platform.OS === 'web' || !InterstitialAd || this.isVideoAdLoading || this.isVideoAdLoaded) {
      return;
    }

    try {
      this.isVideoAdLoading = true;
      const ad = InterstitialAd.createForAdRequest(ADMOB_CONFIG.INTERSTITIAL_VIDEO_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        this.videoAdInstance = ad;
        this.isVideoAdLoaded = true;
        this.isVideoAdLoading = false;
        unsubLoaded?.();

        const waiters = this.videoAdWaiters;
        this.videoAdWaiters = [];
        waiters.forEach((cb) => cb(true));
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        this.videoAdInstance = null;
        this.isVideoAdLoaded = false;
        this.isVideoAdLoading = false;
        unsubError?.();

        const waiters = this.videoAdWaiters;
        this.videoAdWaiters = [];
        waiters.forEach((cb) => cb(false));

        if (!this.videoAdRetryTimer) {
          this.videoAdRetryTimer = setTimeout(() => {
            this.videoAdRetryTimer = null;
            this.preloadVideoAd();
          }, 8000);
        }
      });

      ad.load();
    } catch {
      this.isVideoAdLoading = false;
      this.isVideoAdLoaded = false;
    }
  }

  /**
   * Wait for in-flight video ad loading before opening the setup modal
   */
  private async waitForVideoAd(timeoutMs = VIDEO_AD_WAIT_TIMEOUT_MS): Promise<boolean> {
    if (this.isVideoAdLoaded && this.videoAdInstance) {
      return true;
    }

    if (!this.isVideoAdLoading) {
      this.preloadVideoAd();
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.videoAdWaiters = this.videoAdWaiters.filter((w) => w !== waiter);
          resolve(this.isVideoAdLoaded);
        }
      }, timeoutMs);

      const waiter = (loaded: boolean) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(loaded);
        }
      };

      this.videoAdWaiters.push(waiter);
    });
  }

  /**
   * Show Video Ad when user enables App Lock in settings.
   * Shows the video ad first, then resolves so the setup modal opens.
   */
  public async showVideoAd(_context = 'enable_app_lock'): Promise<boolean> {
    if (Platform.OS === 'web' || !InterstitialAd) {
      return true;
    }

    if (this.isShowingVideoAd || this.isShowingFullScreenAd) {
      return true;
    }

    // If ad is still loading, wait up to VIDEO_AD_WAIT_TIMEOUT_MS
    if (!this.isVideoAdLoaded || !this.videoAdInstance) {
      await this.waitForVideoAd(VIDEO_AD_WAIT_TIMEOUT_MS);
    }

    // If still not available (offline, no fill), initiate background preload and allow user to proceed
    if (!this.isVideoAdLoaded || !this.videoAdInstance) {
      this.preloadVideoAd();
      return true;
    }

    this.isShowingVideoAd = true;
    this.isShowingFullScreenAd = true;
    this.setAppOpenAdSuppressed(true);

    const ad = this.videoAdInstance;
    this.videoAdInstance = null;
    this.isVideoAdLoaded = false;

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.isShowingVideoAd = false;
        this.isShowingFullScreenAd = false;
        this.setAppOpenAdSuppressed(false);
        // Preload next video ad in background after 2 seconds
        setTimeout(() => this.preloadVideoAd(), 2000);
        resolve(true);
      };

      // 35s safety timer guard to prevent UI lock
      const timer = setTimeout(finish, 35000);

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        clearTimeout(timer);
        unsubClosed?.();
        finish();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        clearTimeout(timer);
        unsubError?.();
        finish();
      });

      try {
        ad.show();
      } catch {
        clearTimeout(timer);
        finish();
      }
    });
  }

  // -------------------------------------------------------------
  // REWARDED VIDEO ADS (Strong System for Premium Export Feature)
  // -------------------------------------------------------------

  /**
   * Preload Rewarded Ad for premium features (Export Attendance Report).
   * Maintains an active preloaded instance so it displays instantly when the user taps Export.
   */
  public preloadRewardedAd(): void {
    if (
      Platform.OS === 'web' ||
      (!RewardedInterstitialAd && !RewardedAd) ||
      this.isRewardedLoading ||
      this.isRewardedAdLoaded
    ) {
      return;
    }

    try {
      this.isRewardedLoading = true;
      const AdClass = RewardedInterstitialAd || RewardedAd;
      const ad = AdClass.createForAdRequest(ADMOB_CONFIG.REWARDED_INTERSTITIAL_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const loadEvent = RewardedAdEventType?.LOADED || AdEventType?.LOADED;
      const errorEvent = AdEventType?.ERROR;

      const unsubLoaded = ad.addAdEventListener(loadEvent, () => {
        this.rewardedAdInstance = ad;
        this.isRewardedAdLoaded = true;
        this.isRewardedLoading = false;
        unsubLoaded?.();

        // Notify any active export operations waiting for the ad to load
        const waiters = this.rewardedWaiters;
        this.rewardedWaiters = [];
        waiters.forEach((cb) => cb(true));
      });

      const unsubError = ad.addAdEventListener(errorEvent, () => {
        this.rewardedAdInstance = null;
        this.isRewardedAdLoaded = false;
        this.isRewardedLoading = false;
        unsubError?.();

        const waiters = this.rewardedWaiters;
        this.rewardedWaiters = [];
        waiters.forEach((cb) => cb(false));

        // Auto-retry preload after 6 seconds with backoff
        if (!this.rewardedRetryTimer) {
          this.rewardedRetryTimer = setTimeout(() => {
            this.rewardedRetryTimer = null;
            this.preloadRewardedAd();
          }, 6000);
        }
      });

      ad.load();
    } catch {
      this.isRewardedLoading = false;
      this.isRewardedAdLoaded = false;
    }
  }

  /**
   * Helper that waits for an in-flight rewarded ad load to complete (up to timeoutMs).
   * Ensures user tapping Export doesn't bypass the rewarded ad if it's currently loading.
   */
  private async waitForRewardedAd(timeoutMs = REWARDED_AD_WAIT_TIMEOUT_MS): Promise<boolean> {
    if (this.isRewardedAdLoaded && this.rewardedAdInstance) {
      return true;
    }

    if (!this.isRewardedLoading) {
      this.preloadRewardedAd();
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.rewardedWaiters = this.rewardedWaiters.filter((w) => w !== waiter);
          resolve(this.isRewardedAdLoaded);
        }
      }, timeoutMs);

      const waiter = (loaded: boolean) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(loaded);
        }
      };

      this.rewardedWaiters.push(waiter);
    });
  }

  /**
   * Show exactly 1 Rewarded Ad for the premium export feature.
   * STRONG SYSTEM GUARANTEES:
   * 1. If ad is ready, displays immediately.
   * 2. If ad is still loading, waits up to 4.5 seconds for it to finish and shows it,
   *    rather than skipping it.
   * 3. Gracefully continues with export if offline or if ad service fails, so user
   *    is never trapped or blocked from their report.
   * 4. Immediately preloads the next rewarded ad upon completion.
   */
  public async showRewardedAdForExport(): Promise<boolean> {
    if (Platform.OS === 'web' || (!RewardedInterstitialAd && !RewardedAd)) {
      return true;
    }

    if (this.isShowingRewardedAd) {
      return true;
    }

    // If ad is not ready, wait for currently loading ad before giving up
    if (!this.isRewardedAdLoaded || !this.rewardedAdInstance) {
      await this.waitForRewardedAd(REWARDED_AD_WAIT_TIMEOUT_MS);
    }

    // If still not available (e.g. offline, no fill), initiate background preload and allow export
    if (!this.isRewardedAdLoaded || !this.rewardedAdInstance) {
      this.preloadRewardedAd();
      return true;
    }

    this.isShowingRewardedAd = true;
    this.isShowingFullScreenAd = true;
    this.setAppOpenAdSuppressed(true);

    const ad = this.rewardedAdInstance;
    this.rewardedAdInstance = null;
    this.isRewardedAdLoaded = false;

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.isShowingRewardedAd = false;
        this.isShowingFullScreenAd = false;
        this.setAppOpenAdSuppressed(false);
        // Preload next rewarded ad after 2 seconds
        setTimeout(() => this.preloadRewardedAd(), 2000);
        resolve(true);
      };

      // 35s safety timer guard to prevent UI lock
      const timer = setTimeout(finish, 35000);

      const closeEvent = AdEventType?.CLOSED;
      const errorEvent = AdEventType?.ERROR;
      const rewardEvent = RewardedAdEventType?.EARNED_REWARD;

      if (rewardEvent) {
        ad.addAdEventListener(rewardEvent, () => {
          // Reward successfully earned for export
        });
      }

      const unsubClosed = ad.addAdEventListener(closeEvent, () => {
        clearTimeout(timer);
        unsubClosed?.();
        finish();
      });

      const unsubError = ad.addAdEventListener(errorEvent, () => {
        clearTimeout(timer);
        unsubError?.();
        finish();
      });

      try {
        ad.show();
      } catch {
        clearTimeout(timer);
        finish();
      }
    });
  }
}

export const adMobService = new AdMobService();
