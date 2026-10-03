import * as Crypto from 'expo-crypto';

// Short memory lease for fast, zero-delay unlock during active sessions
const LEASE_MS = 5 * 60 * 1000;
const PERSISTENT_VERIFIER_KEY = 'bizora_mpin_local_verifier_v1';
let verifier: { salt: string; hash: string; expiresAt: number } | null = null;
let persistentCache: { salt: string; hash: string } | null = null;
let generation = 0;

function getStorage() {
  try {
    // Dynamic resolution allows execution in both React Native runtime and node test sandboxes
    return require('./storage');
  } catch {
    return null;
  }
}

export const mpinSecurityService = {
  /**
   * Fast in-memory lease verifier: checks recently validated MPIN without hitting storage or server.
   */
  async verifyLocalMpin(mpin: string): Promise<boolean | null> {
    const cached = verifier;
    if (!cached || cached.expiresAt <= Date.now()) return null;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${cached.salt}:${mpin}`);
    if (cached !== verifier || cached.expiresAt <= Date.now()) return null;
    return hash === cached.hash;
  },

  async saveLocalMpin(mpin: string): Promise<void> {
    const current = ++generation;
    const salt = Crypto.randomUUID();
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${mpin}`);
    if (current === generation) {
      verifier = { salt, hash, expiresAt: Date.now() + LEASE_MS };
      persistentCache = { salt, hash };
    }
  },

  async clearLocalMpin(): Promise<void> {
    generation++;
    verifier = null;
    persistentCache = null;
  },

  /**
   * Hardware-backed persistent verifier (Hybrid Model: SecureStore / iOS Keychain / Android KeyStore).
   * Enables instant <1ms unlock and offline unlock without server dependency.
   */
  async savePersistentMpin(mpin: string): Promise<void> {
    try {
      const storage = getStorage();
      const salt = Crypto.randomUUID();
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${mpin}`);
      persistentCache = { salt, hash };
      if (!storage?.savePreference) return;
      await storage.savePreference(PERSISTENT_VERIFIER_KEY, JSON.stringify({ salt, hash, updatedAt: Date.now() }));
    } catch (e) {
      console.warn('[MpinSecurity] Failed to save persistent verifier:', e);
    }
  },

  async verifyPersistentMpin(mpin: string): Promise<boolean | null> {
    try {
      // 1. In-memory cache check (<1ms)
      if (persistentCache?.salt && persistentCache?.hash) {
        const computed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${persistentCache.salt}:${mpin}`);
        return computed === persistentCache.hash;
      }

      // 2. Hardware-backed secure storage read (~5ms)
      const storage = getStorage();
      if (!storage?.readPreference) return null;
      const raw = await storage.readPreference(PERSISTENT_VERIFIER_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.salt || !data?.hash) return null;
      persistentCache = { salt: data.salt, hash: data.hash };
      const computed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${data.salt}:${mpin}`);
      return computed === data.hash;
    } catch {
      return null;
    }
  },

  async clearPersistentMpin(): Promise<void> {
    persistentCache = null;
    try {
      const storage = getStorage();
      if (!storage?.savePreference) return;
      await storage.savePreference(PERSISTENT_VERIFIER_KEY, null);
    } catch {}
  },
};
