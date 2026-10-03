import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const HAS_SEEN_WELCOME_KEY = 'attendance_has_seen_welcome';
const PENDING_PIN_APPROVAL_KEY = 'bizora_pending_pin_approval';

const getLocalStorage = () => {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
};

export interface StoredPendingPinApproval {
  workplaceId?: string;
  workplaceName: string;
  employeeCode: string;
  employeeName: string;
  requestedAt: string;
  requestId?: string;
  message?: string;
}

export async function getHasSeenWelcome(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      return storage ? storage.getItem(HAS_SEEN_WELCOME_KEY) === 'true' : false;
    }
    const val = await SecureStore.getItemAsync(HAS_SEEN_WELCOME_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setHasSeenWelcome(seen: boolean): Promise<void> {
  try {
    const val = seen ? 'true' : 'false';
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      if (storage) storage.setItem(HAS_SEEN_WELCOME_KEY, val);
      return;
    }
    await SecureStore.setItemAsync(HAS_SEEN_WELCOME_KEY, val);
  } catch (err) {
    console.warn('[Storage] Failed to save welcome status:', err);
  }
}

export async function resetHasSeenWelcome(): Promise<void> {
  return setHasSeenWelcome(false);
}

export async function getStoredPendingPinApproval(): Promise<StoredPendingPinApproval | null> {
  try {
    let jsonStr: string | null = null;
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      jsonStr = storage ? storage.getItem(PENDING_PIN_APPROVAL_KEY) : null;
    } else {
      jsonStr = await SecureStore.getItemAsync(PENDING_PIN_APPROVAL_KEY);
    }
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as StoredPendingPinApproval;
  } catch {
    return null;
  }
}

export async function setStoredPendingPinApproval(data: StoredPendingPinApproval): Promise<void> {
  try {
    const jsonStr = JSON.stringify(data);
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      if (storage) storage.setItem(PENDING_PIN_APPROVAL_KEY, jsonStr);
      return;
    }
    await SecureStore.setItemAsync(PENDING_PIN_APPROVAL_KEY, jsonStr);
  } catch (err) {
    console.warn('[Storage] Failed to save pending PIN approval:', err);
  }
}

export async function clearStoredPendingPinApproval(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      if (storage) storage.removeItem(PENDING_PIN_APPROVAL_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(PENDING_PIN_APPROVAL_KEY);
  } catch (err) {
    console.warn('[Storage] Failed to clear pending PIN approval:', err);
  }
}


// Serialize writes so a late save cannot restore an invitation after it was cleared.
let preferenceQueue: Promise<unknown> = Promise.resolve();
export function savePreference(key: string, value: string | null): Promise<void> {
  const operation = preferenceQueue.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') {
      const storage = getLocalStorage();
      if (value === null) storage?.removeItem(key);
      else storage?.setItem(key, value);
    } else if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  });
  preferenceQueue = operation;
  return operation;
}
export async function readPreference(key: string): Promise<string | null> {
  await preferenceQueue.catch(() => {});
  return Platform.OS === 'web' ? getLocalStorage()?.getItem(key) ?? null : SecureStore.getItemAsync(key);
}

export interface LocalDailyAttendanceCache {
  status: 'PRESENT' | 'PENDING' | 'REJECTED';
  checkInTime?: string;
  checkOutTime?: string;
  source?: 'qr' | 'manual' | 'server';
  savedAt: number;
  reqData?: any;
  record?: any;
}

export async function saveLocalAttendanceState(
  userId: string,
  workplaceId: string,
  date: string,
  state: LocalDailyAttendanceCache
): Promise<void> {
  const key = `bizora_att_${userId}_${workplaceId}_${date}`;
  await savePreference(key, JSON.stringify(state));
}

export async function getLocalAttendanceState(
  userId: string,
  workplaceId: string,
  date: string
): Promise<LocalDailyAttendanceCache | null> {
  try {
    const key = `bizora_att_${userId}_${workplaceId}_${date}`;
    const raw = await readPreference(key);
    if (!raw) return null;
    return JSON.parse(raw) as LocalDailyAttendanceCache;
  } catch {
    return null;
  }
}
