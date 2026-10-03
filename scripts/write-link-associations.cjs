const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['.env.local', '.env']) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}
const directory = path.join(root, 'public', '.well-known');
fs.mkdirSync(directory, { recursive: true });
const team = process.env.APPLE_TEAM_ID;
const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '').split(',').map((value) => value.trim()).filter(Boolean);
if (team && !/^[A-Z0-9]{10}$/.test(team)) throw new Error('APPLE_TEAM_ID must be the 10-character Apple Developer team ID.');
if (fingerprints.some((value) => !/^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(value))) throw new Error('Use colon-separated SHA-256 signing certificate fingerprints.');
const apple = { applinks: { apps: [], details: team ? [{ appID: `${team}.bizora.app`, paths: ['/join', '/join/*'] }] : [] } };
const android = fingerprints.length ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'bizora.app', sha256_cert_fingerprints: fingerprints } }] : [];
fs.writeFileSync(path.join(directory, 'apple-app-site-association'), JSON.stringify(apple, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'assetlinks.json'), JSON.stringify(android, null, 2) + '\n');
console.log(`Link association files generated (iOS: ${team ? 'configured' : 'needs APPLE_TEAM_ID'}, Android: ${fingerprints.length ? 'configured' : 'needs signing fingerprints'}).`);
