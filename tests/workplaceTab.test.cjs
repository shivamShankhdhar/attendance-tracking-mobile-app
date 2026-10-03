const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(customQuery) {
  const state = [];
  let cursor = 0;
  let queryOptions;
  let selected;
  const membership = { id: 'M1', workplaceId: 'W1', workplaceName: 'Office', role: 'EMPLOYER', status: 'ACTIVE' };
  const store = { user: { id: 'U1' }, activeWorkplace: membership, memberships: [membership, { ...membership, id: 'M2', workplaceId: 'W2', workplaceName: 'Shop' }], selectWorkplace: member => { selected = member; } };
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; } };
  const imports = {
    react: { ...React, default: React },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput', ActivityIndicator: 'Spinner', StyleSheet: { create: value => value } },
    '@expo/vector-icons': { Feather: 'Icon' },
    '@tanstack/react-query': { useQuery: options => { queryOptions = options; return customQuery ? customQuery(options) : { data: { name: 'Office', code: 'CODE', address: 'Main Street', timezone: 'Asia/Kolkata', memberCount: 4, attendanceSettings: { requireWifi: true, autoCloseHour: 18 } }, isFetching: false, isError: false }; } },
    '../stores/authStore': { useAuthStore: selector => selector(store) },
    '../services/attendanceApi': { attendanceApi: { getWorkplaceDetails: async id => ({ id }) } },
    '../services/api': {}, '../utils/attendance': { formatFriendlyDate: (value, pattern) => require('date-fns').format(require('date-fns').parseISO(value), pattern) }, '../utils/clipboard': {}, '../constants/colors': { Palette: {} }, '../stores/alertStore': {},
    './AttendanceDataSkeleton': { AttendanceDataSkeleton: 'Skeleton' }, './AttendanceExplorer': { ExplorerTabs: 'Tabs' },
    './DetailPage': { DetailRow: 'DetailRow', DetailSection: 'Section' }, './WorkplaceJoinQrModal': { WorkplaceJoinQrModal: 'Invite' },
    '../screens/JoinRequestsScreen': { JoinRequestsScreen: 'Requests' },
    './WorkplaceSwitcherModal': {
      WorkplaceSwitcherModal: ({ visible, onClose }) => {
        if (!visible) return null;
        return React.createElement(
          'View',
          null,
          store.memberships.map(member =>
            React.createElement(
              'Pressable',
              {
                key: member.id,
                accessibilityRole: 'button',
                accessibilityState: { selected: member.workplaceId === store.activeWorkplace.workplaceId },
                onPress: () => {
                  store.selectWorkplace(member);
                  onClose();
                },
              },
              member.workplaceName
            )
          )
        );
      },
    },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/WorkplaceTab.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; }, console });
  const render = () => { cursor = 0; return exports.WorkplaceTab(); };
  return { render, getQuery: () => queryOptions, getSelected: () => selected };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const expanded = typeof tree.type === 'function' ? nodes(tree.type(tree.props)) : [];
  return [tree, ...expanded, ...(tree.children || []).flat(Infinity).flatMap(nodes)];
}
function find(tree, type) { return nodes(tree).find(node => node.type === type); }

test('workplace overview contains full details and attendance rules without a details route', async () => {
  const app = harness(); const tree = app.render();
  const rows = nodes(tree).filter(node => node.type === 'DetailRow');
  assert.equal(rows.find(row => row.props.label === 'Address').props.value, 'Main Street');
  assert.equal(rows.find(row => row.props.label === 'Workplace Wi-Fi required').props.value, 'Yes');
  assert.equal(rows.find(row => row.props.label === 'Daily auto close').props.value, '18:00 local time');
  assert.deepEqual(Array.from(app.getQuery().queryKey), ['workplace-details', 'U1', 'W1']);
  assert.equal((await app.getQuery().queryFn()).id, 'W1');
});

test('access and invitation render inside the same workplace tab', () => {
  const app = harness(); let tree = app.render();
  find(tree, 'Tabs').props.onSelect('Access'); tree = app.render();
  assert.equal(find(tree, 'Requests').props.embedded, true);
  assert.equal(find(tree, 'Requests').props.admin, true);
  assert.equal(find(tree, 'Requests').props.workplaceId, 'W1');
  find(tree, 'Tabs').props.onSelect('Invite'); tree = app.render();
  assert.equal(find(tree, 'Invite').props.embedded, true);
  assert.equal(find(tree, 'Invite').props.workplaceId, 'W1');
  find(tree, 'Invite').props.onViewRequests();
  assert.equal(find(app.render(), 'Requests').props.embedded, true);
});

test('inline workplace picker selects a real membership and closes without routing', () => {
  const app = harness(); let tree = app.render();
  nodes(tree).find(node => node.props.accessibilityLabel === 'Switch workplace').props.onPress();
  tree = app.render();
  const choices = nodes(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityState && 'selected' in node.props.accessibilityState);
  assert.equal(choices.length, 2);
  choices.find(node => node.props.accessibilityState.selected === false).props.onPress();
  assert.equal(app.getSelected().workplaceId, 'W2');
  assert.equal(find(app.render(), 'Section').props.title, 'Workplace information');
});

test('workplace overview displays synced workplace skeleton when details are loading', () => {
  const app = harness(() => ({ data: undefined, isLoading: true, isFetching: true, isError: false }));
  const tree = app.render();
  const skeleton = find(tree, 'Skeleton');
  assert.ok(skeleton);
  assert.equal(skeleton.props.variant, 'workplace');
  assert.equal(skeleton.props.refreshing, false);
});
