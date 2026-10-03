class AdMobServiceWeb {
  public initAppOpenAds(): void {}
  public preloadAppOpenAd(): void {}
  public setAppOpenAdSuppressed(_suppressed: boolean): void {}
  public preloadInterstitialAd(_preferMedia?: boolean): void {}
  public async showInterstitial(_context?: string): Promise<boolean> {
    return false;
  }
  public preloadVideoAd(): void {}
  public async showVideoAd(_context?: string): Promise<boolean> {
    return true;
  }
  public preloadRewardedAd(): void {}
  public async showRewardedAdForExport(): Promise<boolean> {
    return true;
  }
}

export const adMobService = new AdMobServiceWeb();
