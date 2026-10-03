const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');

function load(file, imports, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => imports[name] || require(name), console, process: { env: {} }, URL, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => status < 400 ? { data } : { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } } });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
function setup(fetch) {
  const storage = new Map();
  const api = load('services/api.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-secure-store': {},
    './reviewerMockApi': { isReviewerToken: () => false, handleReviewerApiRequest: () => null, REVIEWER_ACCESS_TOKEN: '' },
  }, {
    fetch,
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
  });
  const queryClient = new QueryClient();
  const { useAuthStore } = load('stores/authStore.ts', {
    '../services/api': api,
    '../providers/QueryProvider': { queryClient },
    '../services/storage': { readPreference: async (key) => storage.get(key) || null, savePreference: async (key, value) => { if (value === null) storage.delete(key); else storage.set(key, value); }, getStoredPendingPinApproval: async () => null, clearStoredPendingPinApproval: async () => {}, setStoredPendingPinApproval: async () => {} },
    './lockStore': { useLockStore: { getState: () => ({ setShouldPromptSetupAfterSignIn: () => {} }) } },
  });
  return { api, store: useAuthStore, queryClient, storage };
}

test('concurrent authenticated requests share a single refresh', async () => {
  let refreshes = 0;
  const { api } = setup(async (url) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return response({ accessToken: 'new-token' }); }
    return response([]);
  });
  await api.saveRefreshToken('refresh');
  const results = await Promise.all(Array.from({ length: 8 }, () => api.apiRequest('/workplaces')));
  assert.equal(refreshes, 1);
  assert.equal(results.length, 8);
});

test('sign-out immediately clears identity/cache while logout endpoint is pending', async () => {
  const revocation = deferred();
  const { api, store, queryClient, storage } = setup(() => revocation.promise);
  await api.saveRefreshToken('refresh');
  api.setMemoryAccessToken('access');
  store.setState({ user: { id: 'A' }, isAuthenticated: true, isLoading: false });
  queryClient.setQueryData(['employee', 'A'], [{ id: 'private-record' }]);
  const logout = store.getState().logout();
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().user, null);
  assert.equal(api.getMemoryAccessToken(), null);
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
  await logout;
  assert.equal(storage.size, 0);
  revocation.resolve(response(undefined));
});

test('refresh completing after sign-out cannot restore a session', async () => {
  const refresh = deferred();
  const started = deferred();
  const { api, store } = setup(() => { started.resolve(); return refresh.promise; });
  await api.saveRefreshToken('refresh');
  const request = api.apiRequest('/workplaces');
  await started.promise;
  await store.getState().logout();
  refresh.resolve(response({ accessToken: 'late-access', refreshToken: 'late-refresh' }));
  await assert.rejects(request, /Session ended/);
  assert.equal(api.getMemoryAccessToken(), null);
  assert.equal(await api.getStoredRefreshToken(), null);
  assert.equal(store.getState().isAuthenticated, false);
});

test('late login after sign-out cannot authenticate', async () => {
  const pending = deferred();
  const { store, api } = setup(() => pending.promise);
  const login = store.getState().loginWithPin('workplace', 'employee', '1234');
  await store.getState().logout();
  pending.resolve(response({ accessToken: 'late', refreshToken: 'late', user: { id: 'A' }, memberships: [] }));
  await login;
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(api.getMemoryAccessToken(), null);
});

test('terminal 401 signs out and removes cached account data', async () => {
  const { store, api, queryClient } = setup(async () => response(null, 401));
  api.setMemoryAccessToken('expired');
  await api.saveRefreshToken('revoked');
  store.setState({ isAuthenticated: true, user: { id: 'A' } });
  queryClient.setQueryData(['A'], 'private');
  await assert.rejects(api.apiRequest('/workplaces'));
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
  assert.equal(await api.getStoredRefreshToken(), null);
});

test('empty API results stay empty and API failure is propagated', async () => {
  const { api } = setup(async (url) => url.endsWith('/empty') ? response([]) : response(null, 500));
  api.setMemoryAccessToken('valid');
  assert.equal((await api.apiRequest('/empty')).length, 0);
  await assert.rejects(api.apiRequest('/failed'), (error) => error.statusCode === 500);
});

test('workplace selection only accepts active memberships belonging to this user', () => {
  const { store } = setup(async () => response(null));
  const active = { id: 'member-A', workplaceId: 'A', status: 'ACTIVE' };
  store.setState({ memberships: [active, { id: 'invited', status: 'INVITED' }], activeWorkplace: active });
  store.getState().selectWorkplace({ id: 'foreign', workplaceId: 'B' });
  assert.equal(store.getState().activeWorkplace.workplaceId, 'A');
  store.getState().selectWorkplace({ id: 'invited' });
  assert.equal(store.getState().activeWorkplace.workplaceId, 'A');
});

test('workplace local date and QR validation handle timezone boundaries and foreign QR codes', () => {
  const utils = load('utils/attendance.ts', {});
  assert.equal(utils.localDate('Asia/Kolkata', new Date('2026-09-27T20:00:00Z')), '2026-09-28');
  assert.equal(utils.parseAttendanceQr('attendance://checkin?token=valid&workplace=A', 'A'), 'valid');
  assert.throws(() => utils.parseAttendanceQr('attendance://checkin?token=valid&workplace=B', 'A'));
  assert.throws(() => utils.parseAttendanceQr('https://example.com?token=valid&workplace=A', 'A'));
});

test('attendanceApi.getJoinQr and rotateJoinQr request correct endpoints and return payload', async () => {
  const captured = [];
  const { api } = setup(async (url, options) => {
    captured.push({ url, method: options?.method || 'GET' });
    if (url.includes('/join-qr')) {
      return response({
        workplaceId: 'wp-123',
        workplaceName: 'Test Corp',
        qrToken: 'enc-token',
        qrPayload: 'attendance://join?token=enc-token&workplace=wp-123',
      });
    }
    return response(null);
  });
  api.setMemoryAccessToken('valid-token');
  const attendanceApiModule = load('services/attendanceApi.ts', { './api': api });
  const joinData = await attendanceApiModule.attendanceApi.getJoinQr('wp-123');
  assert.equal(joinData.workplaceId, 'wp-123');
  assert.match(joinData.qrPayload, /attendance:\/\/join\?token=enc-token/);
  assert.equal(captured[0].url.endsWith('/workplaces/wp-123/join-qr'), true);
  assert.equal(captured[0].method, 'GET');

  const rotatedData = await attendanceApiModule.attendanceApi.rotateJoinQr('wp-123');
  assert.equal(rotatedData.qrToken, 'enc-token');
  assert.equal(captured[1].url.endsWith('/workplaces/wp-123/join-qr/rotate'), true);
  assert.equal(captured[1].method, 'POST');
});


 test('incorrect MPIN returned as legacy 401 never refreshes or signs out', async () => {
  let calls = 0;
  const { api, store } = setup(async () => { calls++; return { ok: false, status: 401, json: async () => ({ error: { code: 'INVALID_MPIN', message: 'Incorrect MPIN', details: { attemptsRemaining: 4 } } }) }; });
  api.setMemoryAccessToken('valid');
  await api.saveRefreshToken('valid-refresh');
  store.setState({ isAuthenticated: true, user: { id: 'A' } });
  await assert.rejects(api.apiRequest('/auth/mpin/verify', { method: 'POST', body: { mpin: '0000' } }), /Incorrect MPIN/);
  assert.equal(calls, 1);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(api.getMemoryAccessToken(), 'valid');
  assert.equal(await api.getStoredRefreshToken(), 'valid-refresh');
});


test('temporary restoration failures retain credentials and retry without signing in', async () => {
  let online = false;
  const { store, api } = setup(async (url) => {
    if (!online) throw new Error('offline');
    if (url.endsWith('/auth/refresh')) return response({ accessToken: 'new-access', refreshToken: 'renewed' });
    return response({ user: { id: 'A', hasMpin: true }, memberships: [] });
  });
  await api.saveRefreshToken('saved');
  await store.getState().initializeAuth();
  assert.equal(await api.getStoredRefreshToken(), 'saved');
  assert.ok(store.getState().restorationError);
  assert.equal(store.getState().isAuthenticated, false);
  online = true;
  await store.getState().initializeAuth();
  assert.equal(store.getState().restorationError, null);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(store.getState().user.hasMpin, true);
  assert.equal(await api.getStoredRefreshToken(), 'renewed');
});

test('revoked refresh credentials are cleared on restoration', async () => {
  const { store, api } = setup(async () => response(null, 401));
  await api.saveRefreshToken('revoked');
  await store.getState().initializeAuth();
  assert.equal(await api.getStoredRefreshToken(), null);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().restorationError, null);
});

test('restoration validates the remembered workplace against current memberships', async () => {
  const memberships = ['A', 'B'].map((id) => ({ id, workplaceId: id, status: 'ACTIVE' }));
  const { store, api, storage } = setup(async (url) => url.endsWith('/auth/refresh')
    ? response({ accessToken: 'access' }) : response({ user: { id: 'U' }, memberships }));
  await api.saveRefreshToken('saved');
  storage.set('bizora_workplace_U', 'B');
  await store.getState().initializeAuth();
  assert.equal(store.getState().activeWorkplace.workplaceId, 'B');
  assert.equal(store.getState().isWorkplaceConfirmed, true);
  storage.set('bizora_workplace_U', 'foreign');
  await store.getState().initializeAuth();
  assert.equal(store.getState().activeWorkplace.workplaceId, 'A');
  assert.equal(store.getState().isWorkplaceConfirmed, false);
});


test('cancelled PIN approval cannot sign in from a late response', async () => {
  const pendingResponse = deferred();
  const { store, api } = setup(() => pendingResponse.promise);
  store.setState({ pendingPinApproval: { employeeCode: 'E1', workplaceId: 'W1', requestedAt: 'now' } });
  const checking = store.getState().checkPinLoginApprovalStatus();
  await store.getState().clearPendingPinApproval();
  pendingResponse.resolve(response({ approved: true, accessToken: 'access', refreshToken: 'refresh', user: { id: 'U' }, memberships: [] }));
  assert.equal(await checking, false);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(api.getMemoryAccessToken(), null);
  assert.equal(await api.getStoredRefreshToken(), null);
});

test('approved PIN request establishes the real workplace session', async () => {
  const membership = { id: 'M', workplaceId: 'W', status: 'ACTIVE', role: 'EMPLOYEE' };
  const { store, api } = setup(async () => response({ approved: true, accessToken: 'access', refreshToken: 'refresh', user: { id: 'U' }, memberships: [membership] }));
  store.setState({ pendingPinApproval: { employeeCode: 'E1', workplaceId: 'W', requestedAt: 'now' } });
  assert.equal(await store.getState().checkPinLoginApprovalStatus(), true);
  assert.equal(store.getState().activeWorkplace.workplaceId, 'W');
  assert.equal(store.getState().pendingPinApproval, null);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(await api.getStoredRefreshToken(), 'refresh');
});

test('Google callback handles fragment and query responses and errors', () => {
  const { parseGoogleCallback } = load('utils/oauth.ts', {}, { URLSearchParams });
  assert.equal(parseGoogleCallback('bizora://auth#id_token=abc%2Bdef').idToken, 'abc+def');
  assert.equal(parseGoogleCallback('https://example.com/auth?id_token=token').idToken, 'token');
  assert.equal(parseGoogleCallback('bizora://auth#error=access_denied&error_description=No+access').errorDescription, 'No access');
  assert.throws(() => parseGoogleCallback('invalid url'));
});

test('Google browser and deep link share one exchange and failed exchanges can retry', async () => {
  let calls = 0;
  const result = deferred();
  const { completeGoogleSignIn } = load('services/googleSignIn.ts', { '../stores/authStore': { useAuthStore: { getState: () => ({ loginWithGoogle: async () => { calls++; await result.promise; } }) } } });
  const first = completeGoogleSignIn('token');
  assert.equal(completeGoogleSignIn('token'), first);
  await assert.rejects(completeGoogleSignIn('other'), /already in progress/);
  result.resolve();
  await first;
  assert.equal(calls, 1);
  await completeGoogleSignIn('token');
  assert.equal(calls, 2);
  let attempt = 0;
  const retry = load('services/googleSignIn.ts', { '../stores/authStore': { useAuthStore: { getState: () => ({ loginWithGoogle: async () => { if (++attempt === 1) throw new Error('offline'); } }) } } }).completeGoogleSignIn;
  await assert.rejects(retry('token'), /offline/);
  await retry('token');
  assert.equal(attempt, 2);
});


test('tab swipes distinguish deliberate movement, scrolling, reversals and page boundaries', () => {
  const { swipeTabIndex } = load('utils/tabSwipe.ts', {});
  assert.equal(swipeTabIndex(1, 4, -90, 8, -200), 2);
  assert.equal(swipeTabIndex(1, 4, 90, 8, 200), 0);
  assert.equal(swipeTabIndex(1, 4, -40, 4, -800), 2);
  assert.equal(swipeTabIndex(1, 4, -40, 4, 800), 1);
  assert.equal(swipeTabIndex(1, 4, -12, 0, -1000), 1);
  assert.equal(swipeTabIndex(1, 4, -40, 4, -200), 1);
  assert.equal(swipeTabIndex(1, 4, -70, 100, -800), 1);
  assert.equal(swipeTabIndex(0, 4, 90, 0, 200), 0);
  assert.equal(swipeTabIndex(3, 4, -900, 0, -1000), 3);
  assert.equal(swipeTabIndex(0, 1, -90, 0, -800), 0);
  assert.equal(swipeTabIndex(-1, 4, -90, 0, -800), -1);
});

test('date-fns display formatting keeps date-only values stable and formats months consistently', () => {
  const dates = load('utils/attendance.ts', {});
  assert.equal(dates.formatFriendlyDate('2026-09-30', 'd MMM yyyy'), '30 Sep 2026');
  assert.equal(dates.formatFriendlyDate('2026-01-01', 'EEE, d MMM yyyy'), 'Thu, 1 Jan 2026');
  assert.equal(dates.formatMonthYear('2026-09'), 'September 2026');
  assert.equal(dates.formatFriendlyDate(null), '—');
  assert.equal(dates.formatTime('2026-09-30T20:00:00Z', 'Asia/Kolkata'), '1:30 AM');
  assert.equal(dates.localDate('Asia/Kolkata', new Date('2026-09-30T20:00:00Z')), '2026-10-01');
});


test('workplace invite-link creation uses the active workplace POST endpoint', async () => {
  let captured;
  const { api } = setup(async (url, options) => { captured = { url, method: options.method }; return response({ workplaceId: 'W1', joinLink: 'https://example.com/join/token', qrPayload: 'qr' }); });
  api.setMemoryAccessToken('access');
  const { attendanceApi } = load('services/attendanceApi.ts', { './api': api });
  const result = await attendanceApi.createInviteLink('W1');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url.endsWith('/workplaces/W1/invite-link'), true);
  assert.equal(result.joinLink, 'https://example.com/join/token');
});
