const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ADMOB_CONFIG matches all ad unit IDs from admob-ads-info.txt', () => {
  const adsContent = fs.readFileSync(path.join(__dirname, '../src/constants/ads.ts'), 'utf8');

  // Verify all ad IDs from admob-ads-info.txt
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583~1600554870'), 'App ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/5909504970'), 'App Open Ad ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/6170355279'), 'Banner Ad ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/6411058695'), 'Interstitial Media Ad ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/4255754368'), 'Interstitial Video Ad ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/2164939347'), 'Native Advanced Ad ID must match');
  assert.ok(adsContent.includes('ca-app-pub-1113302487630583/5097977027'), 'Rewarded Interstitial Ad ID must match');
});

test('Interstitial ads prioritize Text and Image Media interstitials to maximize fill and revenue', () => {
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '../src/services/adMobService.ts'),
    'utf8'
  );

  // Checks that preferMedia defaults to true and selects INTERSTITIAL_MEDIA_ID
  assert.ok(
    serviceSource.includes('preloadInterstitialAd(preferMedia = true)'),
    'preloadInterstitialAd must default to preferMedia = true (Text & Image/Media)'
  );
  assert.ok(
    serviceSource.includes('ADMOB_CONFIG.INTERSTITIAL_MEDIA_ID'),
    'Must use INTERSTITIAL_MEDIA_ID for text and image interstitials'
  );
  assert.ok(
    serviceSource.includes('MIN_INTERSTITIAL_INTERVAL_MS = 60 * 1000'),
    'Interstitial ads must have a 60-second cooldown interval'
  );
  assert.ok(
    serviceSource.includes('showInterstitial'),
    'adMobService must provide showInterstitial method'
  );

  // Transition points: WorkplaceSelectScreen and WorkplaceSwitcherModal
  const workplaceSelectSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/WorkplaceSelectScreen.tsx'),
    'utf8'
  );
  assert.ok(
    workplaceSelectSource.includes("adMobService.showInterstitial('enter_workplace')"),
    'WorkplaceSelectScreen must trigger interstitial on workplace entry'
  );

  const switcherSource = fs.readFileSync(
    path.join(__dirname, '../src/components/WorkplaceSwitcherModal.tsx'),
    'utf8'
  );
  assert.ok(
    switcherSource.includes("adMobService.showInterstitial('switch_workplace')"),
    'WorkplaceSwitcherModal must trigger interstitial on switching workplace'
  );
});

test('Rewarded ad system for Export is strong, preloaded early, and waits if loading', () => {
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '../src/services/adMobService.ts'),
    'utf8'
  );

  assert.ok(
    serviceSource.includes('REWARDED_AD_WAIT_TIMEOUT_MS = 4500'),
    'Rewarded ad system must define active wait timeout to prevent premature skipping'
  );
  assert.ok(
    serviceSource.includes('waitForRewardedAd'),
    'Must implement waitForRewardedAd helper to wait for in-flight ad loading'
  );
  assert.ok(
    serviceSource.includes('await this.waitForRewardedAd(REWARDED_AD_WAIT_TIMEOUT_MS)'),
    'showRewardedAdForExport must wait for loading ad instead of bypassing'
  );

  const exportScreenSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/ExportReportScreen.tsx'),
    'utf8'
  );
  assert.ok(
    exportScreenSource.includes('adMobService.preloadRewardedAd();'),
    'Rewarded ad must be preloaded on screen mount'
  );
  assert.ok(
    exportScreenSource.includes('await adMobService.showRewardedAdForExport()'),
    'handleExport must call showRewardedAdForExport'
  );
  assert.ok(
    exportScreenSource.includes('setExportResult(result);') &&
    exportScreenSource.includes('setShowSuccessModal(true);'),
    'Export results modal must be presented reliably upon generation'
  );

  // Early preloading on export button tap in EmployerDashboard
  const employerDashboardSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/EmployerDashboard.tsx'),
    'utf8'
  );
  assert.ok(
    employerDashboardSource.includes('adMobService.preloadRewardedAd()'),
    'EmployerDashboard must preload rewarded ad on tapping export button'
  );
});

test('App Open Ads are randomized, frequency capped and suppressed during sensitive flows', () => {
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '../src/services/adMobService.ts'),
    'utf8'
  );

  assert.ok(
    serviceSource.includes('MIN_APP_OPEN_INTERVAL_MS = 4 * 60 * 1000'),
    'App Open Ads must have minimum 4-minute cooldown'
  );
  assert.ok(
    serviceSource.includes('APP_OPEN_TRIGGER_PROBABILITY'),
    'App Open Ads must use randomized probability, not show every single time'
  );
  assert.ok(
    serviceSource.includes('useLockStore.getState().isLocked'),
    'App Open Ads must never show over MPIN lock screen'
  );
  assert.ok(
    serviceSource.includes('useAuthStore.getState().isAuthenticated'),
    'App Open Ads must never show on unauthenticated screen'
  );
});

test('Enabling App Lock in settings shows video ad first before opening setup modal', () => {
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '../src/services/adMobService.ts'),
    'utf8'
  );
  assert.ok(
    serviceSource.includes('preloadVideoAd'),
    'adMobService must provide preloadVideoAd'
  );
  assert.ok(
    serviceSource.includes('showVideoAd'),
    'adMobService must provide showVideoAd'
  );
  assert.ok(
    serviceSource.includes('ADMOB_CONFIG.INTERSTITIAL_VIDEO_ID'),
    'Must use INTERSTITIAL_VIDEO_ID for video ads'
  );

  const securitySettingsSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/SecuritySettingsScreen.tsx'),
    'utf8'
  );
  assert.ok(
    securitySettingsSource.includes('adMobService.preloadVideoAd();'),
    'SecuritySettingsScreen must preload video ad on mount'
  );
  assert.ok(
    securitySettingsSource.includes("await adMobService.showVideoAd('enable_app_lock')"),
    'SecuritySettingsScreen must await showVideoAd before opening setup modal'
  );
  assert.ok(
    securitySettingsSource.includes('setShowChooseLockTypeModal(true)'),
    'SecuritySettingsScreen must open setup modal after video ad completes'
  );
});

test('MPIN setup modal and setup screen render docked AdBanner at the bottom', () => {
  const securitySettingsSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/SecuritySettingsScreen.tsx'),
    'utf8'
  );
  // Verify showChangeModal has AdBanner inside it
  const changeModalStart = securitySettingsSource.indexOf('visible={showChangeModal}');
  const changeModalEnd = securitySettingsSource.indexOf('</Modal>', changeModalStart);
  const changeModalSection = securitySettingsSource.substring(changeModalStart, changeModalEnd);
  assert.ok(
    changeModalSection.includes('<AdBanner position="bottom"'),
    'MPIN change/setup modal in SecuritySettingsScreen must include AdBanner at bottom'
  );

  const mpinSetupScreenSource = fs.readFileSync(
    path.join(__dirname, '../src/screens/MpinSetupScreen.tsx'),
    'utf8'
  );
  assert.ok(
    mpinSetupScreenSource.includes('<AdBanner position="bottom"'),
    'MpinSetupScreen must include AdBanner docked at bottom'
  );
});

