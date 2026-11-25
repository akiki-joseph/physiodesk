// The website: home page, client page and the legal pages Google Play asks for.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { ROOT, SITE, getBrowser, closeBrowser } = require('./helpers');

let site;
before(() => {
  site = fs.mkdtempSync(path.join(os.tmpdir(), 'junctura-site-'));
  fs.cpSync(SITE, site, { recursive: true });
  for (const f of ['anim.js', 'exercises.js', 'config.js']) fs.copyFileSync(path.join(ROOT, 'www', f), path.join(site, f));
  fs.cpSync(path.join(ROOT, 'www', 'fonts'), path.join(site, 'fonts'), { recursive: true });
});
after(async () => { await closeBrowser(); fs.rmSync(site, { recursive: true, force: true }); });

test('legal pages load, link to each other, and every local link and file exists', async () => {
  const page = await (await getBrowser()).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const failed = []; page.on('requestfailed', r => failed.push(r.url()));
  for (const f of ['index.html', 'privacy.html', 'terms.html', 'delete-account.html']) {
    await page.goto(`file://${site}/${f}`);
    const links = await page.$$eval('a[href]', a => a.map(x => x.getAttribute('href')).filter(h => !/^(https?:|mailto:)/.test(h)));
    for (const h of links) {
      const target = path.join(site, h === './' ? 'index.html' : h.split('#')[0]);
      assert.ok(fs.existsSync(target), `${f} links to ${h}, which is missing`);
    }
    const text = await page.textContent('body');
    if (f !== 'index.html') for (const other of ['Privacy policy', 'Terms of use', 'Delete your account']) assert.ok(text.includes(other), `${f} links to ${other}`);
  }
  for (const f of ['privacy.html', 'terms.html', 'delete-account.html']) {
    const html = fs.readFileSync(path.join(site, f), 'utf8');
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/, `${f} still has a placeholder`);
    assert.match(html, /mailto:junctura\.app@gmail\.com/, `${f} shows the contact email`);
  }
  await page.goto(`file://${site}/privacy.html`);
  assert.match(await page.textContent('main'), /no advertising and no analytics/);
  await page.goto(`file://${site}/delete-account.html`);
  assert.match(await page.textContent('main'), /Settings → Account/);
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
});
