// Every exercise in the catalogue has an animation that draws cleanly through its whole movement.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ROOT, getBrowser, closeBrowser } = require('./helpers');

after(closeBrowser);

test('all 800 exercises animate without broken numbers, fast enough for a phone', async () => {
  const page = await (await getBrowser()).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<div></div>');
  await page.addScriptTag({ path: path.join(ROOT, 'www', 'anim.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'www', 'exercises.js') });
  const r = await page.evaluate(() => {
    const keys = [...new Set(EX_ALL.map(x => x[5]))], bad = [], missing = keys.filter(k => !PhysioAnim.has(k));
    const t0 = performance.now(); let frames = 0;
    for (const k of keys) for (let i = 0; i < 12; i++) {
      for (const guide of [false, true]) {
        const s = PhysioAnim.svgFor(k, i / 12, { guide }); frames++;
        if (/NaN|undefined|Infinity/.test(s) || !s.startsWith('<svg')) bad.push(`${k}@${i}`);
      }
    }
    return { exercises: EX_ALL.length, keys: keys.length, missing, bad, ms: (performance.now() - t0) / frames };
  });
  assert.equal(r.exercises, 800);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.bad, []);
  assert.ok(r.ms < 3, `one frame takes ${r.ms.toFixed(2)} ms`);
  assert.deepEqual(errors, []);
  await page.close();
});

test('captions follow the movement and muscles have plain names', async () => {
  const page = await (await getBrowser()).newPage();
  await page.setContent('<div></div>');
  await page.addScriptTag({ path: path.join(ROOT, 'www', 'anim.js') });
  const r = await page.evaluate(() => ({
    steps: [0.1, 0.45, 0.6, 0.97].map(p => PhysioAnim.phase('bridge', p).step),
    stretch: PhysioAnim.phase('child', 0.1).kind,
    hold: PhysioAnim.phase('plank', 0.1).kind,
    sides: [PhysioAnim.phase('birdDog', 0.2).side, PhysioAnim.phase('birdDog', 0.7).side],
    muscles: PhysioAnim.muscles('bridge'),
  }));
  assert.deepEqual(r.steps, ['go', 'hold', 'back', 'rest']);
  assert.equal(r.stretch, 'stretch');
  assert.equal(r.hold, 'iso');
  assert.deepEqual(r.sides, [0, 1]);
  assert.ok(r.muscles.includes('Glutes'));
  await page.close();
});
