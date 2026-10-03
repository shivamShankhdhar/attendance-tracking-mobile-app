const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const state = [];
  let cursor = 0;
  const user = { id: 'usr_12345678', name: 'Shivam Test', email: 'shivam@example.com', phone: '+919876543210', status: 'ACTIVE', hasMpin: true };
  const memberships = [
    { id: 'M1', workplaceId: 'W1', workplaceName: 'Main Office', role: 'EMPLOYER', status: 'ACTIVE' },
    { id: 'M2', workplaceId: 'W2', workplaceName: 'Second Store', role: 'EMPLOYEE', status: 'ACTIVE' },
  ];
  const store = { user, memberships, isAuthenticated: true, activeWorkplace: memberships[0] };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  const imports = {
    react: { ...React, default: React },
    'expo-router': { Redirect: () => null, useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }) },
    'expo-constants': { default: { expoConfig: { version: '1.0.0' } } },
    'react-native': {
      View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', StyleSheet: { create: val => val },
      Platform: { OS: 'ios' }, Share: { share: async () => {} }, Linking: { openURL: async () => {} }
    },
    '../components/DetailPage': {
      DetailPage: 'DetailPage',
      DetailSection: 'DetailSection',
      DetailRow: 'DetailRow',
    },
    '../stores/authStore': { useAuthStore: selector => selector(store) },
    '../constants/colors': { Palette: {} },
    '../components/Avatar': { Avatar: () => 'Avatar' },
    '../components/ConfirmDialog': { ConfirmDialog: () => 'ConfirmDialog' },
    '../components/AboutModal': { AboutModal: () => 'AboutModal' },
    '../components/ThemeSwitcherModal': { ThemeSwitcherModal: () => 'ThemeSwitcherModal' },
    '../services/workplaceLinks': { PLAY_STORE_URL: 'https://play', APP_STORE_URL: 'https://app' },
    '../constants/app': { APP_NAME: 'Bizora', PRIVACY_POLICY_URL: 'https://bizora.app/privacy', ABOUT_URL: 'https://bizora.app/about' },
    '../utils/clipboard': { copyToClipboard: async () => true },
    '../stores/alertStore': { showSuccess: () => {}, showError: () => {} },
    '../hooks/use-theme': { useTheme: () => ({ themeMode: 'dark', isDark: true, palette: {} }) },
  };

  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/settings.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in imports)) throw new Error(`Missing mock: ${name}`); return imports[name]; }, console });
  const render = () => { cursor = 0; return exports.default(); };
  return { render };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const expanded = typeof tree.type === 'function' ? nodes(tree.type(tree.props)) : [];
  return [tree, ...expanded, ...(tree.children || []).flat(Infinity).flatMap(nodes)];
}

test('settings places user-specific options at top and groups about/privacy/share', () => {
  const app = harness();
  const tree = app.render();
  const sections = nodes(tree).filter(n => n.type === 'DetailSection');

  // Verify section order
  const titles = sections.map(s => s.props.title);
  assert.equal(titles[0], 'Account & Profile');
  assert.equal(titles[1], 'Security');
  assert.equal(titles[2], 'Appearance');
  assert.equal(titles[3], 'About');
  assert.equal(titles[4], 'Session');

  // Verify Account & Profile contains rich user options
  const userRows = nodes(sections[0]).filter(n => n.type === 'DetailRow').map(r => r.props.label);
  assert.ok(userRows.includes('Full name'));
  assert.ok(userRows.includes('Email address'));
  assert.ok(userRows.includes('Phone number'));
  assert.ok(userRows.includes('My join requests'));
  assert.ok(userRows.includes('Linked workplaces'));
  assert.ok(!userRows.includes('Account ID'));
  assert.ok(!userRows.includes('Account status'));

  // Verify workplace switcher/details are removed
  const allRows = nodes(tree).filter(n => n.type === 'DetailRow').map(r => r.props.label);
  assert.ok(!allRows.includes('Switch workplace'));
  assert.ok(!allRows.includes('Workplace details'));

  // Verify About section groups About, Website, Privacy, Share app, Version
  const aboutRows = nodes(sections[3]).filter(n => n.type === 'DetailRow').map(r => r.props.label);
  assert.ok(aboutRows.includes('About Bizora'));
  assert.ok(aboutRows.includes('Official website'));
  assert.ok(aboutRows.includes('Privacy policy'));
  assert.ok(aboutRows.includes('Share app'));
  assert.ok(aboutRows.includes('App version'));
});
