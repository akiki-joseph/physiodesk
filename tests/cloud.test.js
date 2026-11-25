// Accounts and cloud sync, against the fake Supabase.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, signUp, fakeServer, closeBrowser } = require('./helpers');

after(closeBrowser);

test('sync up, sign out, sign back in, other-device changes, deletes, delete account', async () => {
  const { page, errors, ctx } = await openApp({ cloud: true });
  await signUp(page);
  assert.equal(await page.evaluate(() => document.getElementById('auth-root').hidden), true);
  await page.click('[data-act=onbStart]:not([data-demo])');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.clients.push({ id: 'c1', name: 'Maya Khoury', phone: '71 230 914' });
    S.appts.push({ id: 'a1', clientId: 'c1', serviceId: 's1', placeId: 'own', kind: 'private', date: today(), time: '10:00', duration: 45, price: 30, cut: 0, status: 'scheduled', paid: false, method: 'Cash', calEventId: '99' });
    save();
  });
  await page.waitForTimeout(3500);
  let srv = await fakeServer(page);
  assert.ok(srv.records.some(r => r.kind === 'clients' && r.data.name === 'Maya Khoury'), 'client uploaded');
  assert.equal(srv.records.find(r => r.id === 'a1').data.calEventId, undefined, 'phone-only fields stay on the phone');

  // signing out clears the phone; signing in brings everything back
  await page.evaluate(() => go('setup'));
  await page.waitForTimeout(300);
  await page.click('[data-act=signOut]');
  await page.waitForTimeout(600);
  await page.click('.modal [data-act=askBtn]');
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => S.clients.length), 0);
  await page.fill('#au-email', 'karim@example.com');
  await page.fill('#au-pass', 'wrongpass');
  await page.click('#au-go');
  await page.waitForTimeout(500);
  assert.match(await page.textContent('#au-msg'), /don.t match/);
  await page.fill('#au-pass', 'secret123');
  await page.click('#au-go');
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => S.clients.map(c => c.name).join()), 'Maya Khoury');
  assert.equal(await page.evaluate(() => S.settings.therapist), 'Karim Haddad');

  // a change made on another phone arrives
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('fakeServer')); s.t++; const r = s.records.find(x => x.id === 'c1'); r.data = { ...r.data, name: 'Maya Khoury Saab' }; r.updated_at = new Date(1700000000000 + s.t * 1000).toISOString(); localStorage.setItem('fakeServer', JSON.stringify(s)); });
  await page.evaluate(() => cloudSync());
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => getClient('c1').name), 'Maya Khoury Saab');

  // deleting on the phone marks it deleted in the cloud, and nothing is uploaded twice
  await page.evaluate(() => { S.appts = S.appts.filter(a => a.id !== 'a1'); save(); });
  await page.waitForTimeout(3500);
  srv = await fakeServer(page);
  assert.equal(srv.records.find(r => r.id === 'a1').deleted, true);
  const ups = await page.evaluate(() => window.__upserts);
  await page.evaluate(() => cloudSync());
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.__upserts), ups);

  // delete my account
  await page.evaluate(() => go('setup'));
  await page.waitForTimeout(300);
  await page.click('[data-act=deleteAccount]');
  await page.fill('#da-c', 'DELETE');
  await page.click('.modal button[type=submit]');
  await page.waitForTimeout(1200);
  assert.match(await page.textContent('#au-msg'), /deleted/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
