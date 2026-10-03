const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('invite QR stays hidden and unfetched until requested, including cached and switched workplaces', async () => {
  const state = []; let cursor = 0; let options; let calls = 0; let linkCalls = 0; let cachedKey;
  const client = { setQueryData: key => { cachedKey = key; } };
  const React = { Fragment: 'Fragment', createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; } };
  const imports = {
    react: { ...React, default: React },
    'react-native': { Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner', StyleSheet: { create: value => value }, Share: {} },
    '@expo/vector-icons': { Feather: 'Icon' }, 'react-native-qrcode-svg': { __esModule: true, default: 'QR' },
    '@tanstack/react-query': { useMutation: config => ({ isPending: false, mutate: async () => { const data = await config.mutationFn(); config.onSuccess(data); } }), useQueryClient: () => client, useQuery: config => { options = config; return { data: { qrPayload: 'cached-qr', joinLink: 'https://example.com/invite' }, isFetching: false }; } },
    '../stores/authStore': { useAuthStore: selector => selector({ user: { id: 'U' } }) },
    '../services/attendanceApi': { attendanceApi: { createInviteLink: async id => { linkCalls++; return { qrPayload: 'generated-qr', joinLink: `https://example.com/invite/${id}` }; }, getJoinQr: async () => { calls++; return { qrPayload: 'generated-qr' }; } } },
    '../services/api': { getSessionVersion: () => 0 }, '../utils/clipboard': {}, '../services/workplaceLinks': {}, '../constants/colors': { Palette: {} },
    './SkeletonScreens': { SkeletonBox: 'Skeleton' }, './ConfirmDialog': { ConfirmDialog: 'Confirm' }, '../stores/alertStore': {},
    './illustrations/IllustrationAssets': { EnvelopePersonPlusIllustration: 'Illustration' },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/components/WorkplaceJoinQrModal.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(source, { exports, require: name => imports[name], console });
  function render(workplaceId = 'A') { cursor = 0; return exports.WorkplaceJoinQrModal({ visible: true, embedded: true, workplaceId, workplaceName: 'Office', onClose() {} }); }
  function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...(tree.children || []).flat(Infinity).flatMap(nodes)] : []; }
  let tree = render();
  assert.equal(options.enabled, false);
  assert.equal(calls, 0);
  assert.equal(nodes(tree).some(node => node.type === 'QR'), false);
  assert.equal(nodes(tree).some(node => node.props.label === 'Share invite'), false);
  nodes(tree).find(node => node.props.label === 'Generate invite QR').props.onPress();
  tree = render();
  assert.equal(options.enabled, true);
  assert.equal(nodes(tree).some(node => node.type === 'QR'), true);
  assert.equal((await options.queryFn()).qrPayload, 'generated-qr');
  assert.equal(calls, 1);
  tree = render('B');
  assert.equal(options.enabled, false);
  assert.equal(nodes(tree).some(node => node.type === 'QR'), false);
  await nodes(tree).find(node => node.props.label === 'Invite via link').props.onPress();
  tree = render('B');
  assert.equal(linkCalls, 1);
  assert.deepEqual(Array.from(cachedKey), ['workplace-join-qr', 'U', 'B']);
  assert.equal(nodes(tree).some(node => node.type === 'QR'), false);
  assert.equal(nodes(tree).some(node => node.props.label === 'Share invite'), true);
  nodes(tree).find(node => node.props.label === 'Show invite QR').props.onPress();
  assert.equal(nodes(render('B')).some(node => node.type === 'QR'), true);
});
