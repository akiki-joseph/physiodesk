// The client exercise page: the therapist sends it, the client opens it, ticks exercises and
// runs a guided session, and the therapist sees the ticked days.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { ROOT, SITE, getBrowser, openApp, signUp, fakeServer, closeBrowser } = require('./helpers');

// the website as the publishing workflow puts it together (.github/workflows/site.yml)
let site;
before(() => {
  site = fs.mkdtempSync(path.join(os.tmpdir(), 'junctura-site-'));
  fs.cpSync(SITE, site, { recursive: true });
  for (const f of ['anim.js', 'exercises.js']) fs.copyFileSync(path.join(ROOT, 'www', f), path.join(site, f));
  fs.cpSync(path.join(ROOT, 'www', 'fonts'), path.join(site, 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(site, 'config.js'), "window.PD_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseKey:'k'}");
});
after(async () => { await closeBrowser(); fs.rmSync(site, { recursive: true, force: true }); });

test('send, open, tick, guided session, and the therapist sees the days', async () => {
  const { page, errors, ctx } = await openApp({ cloud: true });
  await signUp(page);
  await page.evaluate(() => {
    window.__opened = []; window.open = u => { window.__opened.push(u); return {}; };
    S.settings.onboarded = true; S.settings.docName = 'Karim Haddad'; S.settings.docTitle = 'Physiotherapist'; S.settings.docPhone = '70 123 456';
    const n = k => EX_ALL.find(r => r[5] === k)[0];
    S.clients.push({ id: 'c-maya', name: 'Maya Khoury', phone: '71 222 333', program: { items: [{ n: n('bridge'), name: 'Bridge', dose: '3 × 12' }, { n: n('heelRaise'), name: 'Heel raise', dose: '2 × 15' }, { n: n('plank'), name: 'Plank', dose: '3 × 20 s' }, { name: 'Walk 20 minutes', dose: '1 × 20 min' }], freq: 'Every day', note: 'Ice 15 minutes after.', at: today() } });
    save(); go('client-c-maya');
  });
  await page.waitForTimeout(600);
  await page.click('[data-act=progSend]');
  await page.waitForTimeout(800);
  const opened = await page.evaluate(() => window.__opened[0] || '');
  assert.match(opened, /^https:\/\/wa\.me\/96171222333\?text=/);
  const text = decodeURIComponent(opened.split('text=')[1]);
  const token = (text.match(/https:\/\/site\.example\/p\/#t=([A-Za-z0-9]{24})/) || [])[1];
  assert.ok(token, 'the message carries the page link');
  const row = (await fakeServer(page)).shares[token];
  assert.equal(row.data.who, 'Maya');
  assert.equal(row.data.items.length, 4);

  // the client's phone
  const cctx = await (await getBrowser()).newContext({ viewport: { width: 390, height: 844 } });
  const rpc = [];
  await cctx.route('https://x.supabase.co/rest/v1/rpc/*', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}'); rpc.push({ fn: u.split('/').pop(), body });
    if (u.endsWith('get_shared_program')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(body.p_token === token ? { ...row.data, done: row.done } : null) });
    return r.fulfill({ status: 204, body: '' });
  });
  const c = await cctx.newPage(); const cerr = []; c.on('pageerror', e => cerr.push(e.message));
  await c.goto(`file://${site}/p/index.html#t=${token}`);
  await c.waitForTimeout(1200);
  assert.match((await c.textContent('h1')).replace(/\s+/g, ' '), /Hi Maya,\s*your home exercises/);
  assert.equal(await c.$$eval('.card', a => a.length), 4);
  assert.deepEqual(await c.$$eval('.card .chips .chip:first-child', a => a.map(x => x.textContent)), ['3 sets × 12 reps', '2 sets × 15 reps', '3 sets × 20 seconds', '20 min']);
  await c.click('.card[data-i="0"] .mark');
  await c.waitForTimeout(300);
  assert.equal(await c.textContent('#ring b'), '1/4');
  const mark = rpc.filter(x => x.fn === 'mark_program_done').pop();
  assert.deepEqual(mark.body.p_items, [0]);

  await c.click('#go');
  await c.waitForTimeout(3700);
  assert.equal(await c.textContent('.play .of'), '2/4', 'starts at the first exercise not done yet');
  assert.match(await c.textContent('#pbig'), /^1/, 'counts a rep per movement');
  await c.click('[data-a=setdone]');
  await c.waitForTimeout(400);
  assert.match(await c.textContent('.rest h2'), /Set 2 of 2/);
  await c.click('[data-a=skiprest]');
  await c.click('[data-a=next]');
  await c.waitForTimeout(300);
  assert.equal(await c.textContent('#pbig'), '0:20', 'holds are timed');
  await c.click('[data-a=next]'); await c.click('[data-a=next]');
  await c.waitForTimeout(300);
  assert.ok(await c.$('.rest h2'));
  await c.click('[data-a=close]');

  await c.goto(`file://${site}/p/index.html`);
  await c.waitForTimeout(400);
  assert.match(await c.textContent('.msg p'), /needs the link/);
  assert.deepEqual(cerr, []);
  await cctx.close();

  // back in the app
  await page.evaluate(t => { const s = JSON.parse(localStorage.getItem('fakeServer')); s.shares[t].done = { [today()]: [0, 1], [addDays(today(), -2)]: [0] }; localStorage.setItem('fakeServer', JSON.stringify(s)); for (const k in ADH) delete ADH[k]; render(); }, token);
  await page.waitForTimeout(500);
  assert.match(await page.textContent('.adh'), /Done on 2 of the last 7 days/);

  // deleting the client takes the page down
  await page.evaluate(() => ACT.deleteClient({ dataset: { id: 'c-maya' } }));
  await page.waitForTimeout(300);
  await page.click('#modal-root .btn.bad');
  await page.waitForTimeout(500);
  assert.equal((await fakeServer(page)).shares[token], undefined);
  assert.deepEqual(errors, []);
  await ctx.close();
});
