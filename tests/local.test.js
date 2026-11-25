// The app on its own (no account): sample practice, home exercises, documents, consent, waitlist.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, startDemo, closeBrowser } = require('./helpers');

after(closeBrowser);

test('sample practice opens on Today with no errors', async () => {
  const { page, errors, ctx } = await openApp();
  await startDemo(page);
  assert.match(await page.textContent('h1'), /Good (morning|afternoon|evening), Karim/);
  assert.ok(await page.evaluate(() => S.clients.length > 3 && S.appts.length > 10));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('home exercises: pick from the catalogue, search, save', async () => {
  const { page, errors, ctx } = await openApp();
  await startDemo(page);
  await page.evaluate(() => go('client-demo-c0'));
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => (getClient('demo-c0').program || { items: [] }).items.length);
  await page.click('[data-act=editProg]');
  await page.waitForTimeout(400);
  await page.selectOption('#prog-cat', '11');
  await page.waitForTimeout(300);
  await page.click('#prog-lib [data-act=exInfo]');
  await page.waitForTimeout(800);
  assert.ok(await page.$('.exbig .exfigwrap svg'), 'the exercise sheet shows the animation');
  assert.ok((await page.textContent('.exstep')).length > 2, 'with a caption');
  await page.click('[data-act=exAddDetail]');
  await page.waitForTimeout(700);
  await page.fill('#prog-q', 'calf');
  await page.waitForTimeout(300);
  assert.ok(await page.$$eval('#prog-lib .ex', x => x.length) > 3, 'search finds calf exercises');
  await page.click('[data-act=progSave]');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => getClient('demo-c0').program.items.length), before + 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('consent signature, measures, invoice and progress letter', async () => {
  const { page, errors, ctx } = await openApp();
  await startDemo(page);
  await page.evaluate(() => { S.settings.lastBackup = today(); S.settings.docTitle = 'Physiotherapist'; save(); go('client-demo-c0'); });
  await page.waitForTimeout(600);
  await page.click('[data-act=consent]');
  await page.waitForTimeout(300);
  const box = await (await page.$('#sig-c')).boundingBox();
  await page.mouse.move(box.x + 20, box.y + 60); await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(box.x + 20 + i * 12, box.y + 60 + Math.sin(i) * 20);
  await page.mouse.up();
  await page.click('[data-act=consentSave]');
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => getClient('demo-c0').consent.sig.length > 100), 'signature saved');

  await page.click('[data-act=addMeasure]');
  await page.waitForTimeout(300);
  await page.selectOption('#ms-kind', 'rom');
  await page.fill('#ms-name', 'Right knee flexion');
  await page.fill('#ms-val', '120');
  await page.click('.modal button[type=submit]');
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => S.measures.some(m => m.clientId === 'demo-c0' && m.name === 'Right knee flexion' && m.value === 120)), 'measure saved');

  await page.click('[data-act=invoiceClient]');
  await page.waitForTimeout(300);
  await page.click('[data-act=invPick][data-k=month]');
  await page.waitForSelector('.modal img', { timeout: 8000 });
  assert.match(await page.$eval('.modal img', i => i.src), /^data:image\/png/);
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(500);

  await page.click('[data-act=letter]');
  await page.waitForTimeout(300);
  await page.fill('#lt-body', 'Good progress. Continue the home program.');
  await page.click('.modal button[type=submit]');
  await page.waitForSelector('.modal img', { timeout: 8000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('room for the status bar: the page and sheets keep clear of it (Android edge to edge)', async () => {
  const { page, errors, ctx } = await openApp();
  await startDemo(page);
  // Capacitor 8 puts the status bar and navigation bar sizes in these CSS variables
  await page.evaluate(() => { const r = document.documentElement.style; r.setProperty('--safe-area-inset-top', '40px'); r.setProperty('--safe-area-inset-bottom', '24px'); });
  const r = await page.evaluate(() => ({
    main: getComputedStyle(document.querySelector('.main')).paddingTop,
    nav: getComputedStyle(document.querySelector('.nav')).bottom,
  }));
  assert.equal(r.main, '56px');
  assert.equal(r.nav, '34px');
  assert.equal(await page.evaluate(() => smsAvailable()), true, 'the SMS option shows outside the phone app');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Google Play version (no SMS part): reminders by notification only', async () => {
  const { getBrowser } = require('./helpers');
  const ctx = await (await getBrowser()).newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.PD_CONFIG={}' }));
  // a phone app whose native part has the calendar but not the SMS plugin
  await ctx.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {} }; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(require('./helpers').APP);
  await page.waitForTimeout(500);
  await startDemo(page);
  await page.evaluate(() => go('setup'));
  await page.waitForTimeout(400);
  assert.equal(await page.$('#set-remindMode'), null, 'no "send an SMS automatically" choice');
  assert.match(await page.locator('section.set-list', { hasText: 'Client reminders' }).innerText(), /Tap it and WhatsApp opens/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
