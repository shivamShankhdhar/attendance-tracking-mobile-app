import { readPreference, savePreference } from './storage';

const PENDING_JOIN = 'bizora_pending_join_v1';
export const PLAY_STORE_URL =
  process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=bizora.app';
export const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/bizora/id6740000000';

export function getWorkplaceLink(token: string, native = false): string {
  const base = process.env.EXPO_PUBLIC_JOIN_BASE_URL || 'https://www.bizora.shivamshankhdhar.online/join';
  const url = new URL(native ? 'bizora://join' : base);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(token)}`;
  url.search = '';
  return url.toString();
}
export const savePendingJoin = (token: string) => savePreference(PENDING_JOIN, JSON.stringify({ token, savedAt: Date.now() }));
export const clearPendingJoin = () => savePreference(PENDING_JOIN, null);
export async function getPendingJoin(): Promise<string | null> {
  try {
    const raw = await readPreference(PENDING_JOIN);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.token === 'string' && data.token.length <= 4096 && Date.now() - data.savedAt < 7 * 86400000) return data.token;
    await clearPendingJoin();
  } catch { /* Invalid/expired saved invitations do not block sign-in. */ }
  return null;
}


function parseUrlCandidate(target: string): string | null {
  try {
    const url = new URL(target);
    if (!['https:', 'http:', 'bizora:', 'attendance:'].includes(url.protocol)) return null;
    const path = `${url.protocol === 'bizora:' || url.protocol === 'attendance:' ? '/' + url.hostname : ''}${url.pathname}`;
    if (!/\/join(?:\/|$)/.test(path)) return null;
    const token =
      url.searchParams.get('token') ||
      url.searchParams.get('code') ||
      url.searchParams.get('invite') ||
      decodeURIComponent(path.match(/\/join\/([^/]+)\/?$/)?.[1] || '');
    return token && token.length <= 4096 ? token : null;
  } catch {
    return null;
  }
}

/** Supports current path links, shared messages, query links/QR payloads, and bare tokens. */
export function parseWorkplaceInvite(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 8192) return null;
  
  // 1. Direct URL parse
  const direct = parseUrlCandidate(value);
  if (direct) return direct;

  // 2. Extract URL embedded inside shared text messages (e.g. WhatsApp/SMS shares)
  const urlMatch = value.match(/(?:https?|bizora|attendance):\/\/[^\s"'<>]+/i);
  if (urlMatch) {
    const embedded = parseUrlCandidate(urlMatch[0]);
    if (embedded) return embedded;
  }

  // 3. Fallback to bare token match
  return /^[a-zA-Z0-9:_-]{6,4096}$/.test(value) ? value : null;
}

export interface TrackedJoin { requestId: string; token?: string }
export async function saveTrackedJoin(userId: string, request: TrackedJoin) {
  await savePreference(`bizora_tracked_join_${userId}`, JSON.stringify(request));
}
export async function getTrackedJoin(userId: string): Promise<TrackedJoin | null> {
  try {
    const raw = await readPreference(`bizora_tracked_join_${userId}`);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.requestId === 'string' ? value : null;
  } catch { return null; }
}
export const clearTrackedJoin = (userId: string) => savePreference(`bizora_tracked_join_${userId}`, null);
