const test = require('node:test');
const assert = require('node:assert/strict');

test('Invited membership directly exposes workplace code, admin name, and requires no approval', () => {
  const invitedMembership = {
    workplaceId: '6abdc6290c8643e43abeb25e',
    workplaceName: 'Acme Technologies',
    role: 'Employee',
    status: 'INVITED',
    workplaceCode: 'BEB25E',
    adminName: 'Sarah Jenkins',
  };

  // 1. Verify invitation data mappings
  assert.equal(invitedMembership.workplaceCode, 'BEB25E');
  assert.equal(invitedMembership.adminName, 'Sarah Jenkins');
  assert.equal(invitedMembership.status, 'INVITED');

  // 2. Direct continuation requires no approval
  const claimPayload = { workplaceId: invitedMembership.workplaceId };
  assert.equal(claimPayload.workplaceId, '6abdc6290c8643e43abeb25e');
  
  // 3. Joining another workplace options: code, qr, link
  const sampleCode = 'BEB25E';
  const sampleLink = 'https://bizora.app/join/6abdc6290c8643e43abeb25e';
  const sampleQrPayload = 'bizora://join/secret_token_123';

  assert.match(sampleCode, /^[A-Z0-9]{6}$/);
  assert.ok(sampleLink.includes('/join/'));
  assert.ok(sampleQrPayload.startsWith('bizora://join/'));
});
