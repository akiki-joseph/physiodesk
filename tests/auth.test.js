// Email confirmation, the link from the email, forgot password, change password.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, signUp, closeBrowser } = require('./helpers');

after(closeBrowser);

test('confirm-your-email screen, then the link in the email opens the app', async () => {
  const { page, errors, ctx } = await openApp({ cloud: true, confirm: true });
  await signUp(page);
  assert.match(await page.textContent('.auth h1'), /Confirm your email/);
  assert.equal(await page.evaluate(() => window.__redirect), 'junctura://auth/callback');
  await page.click('[data-act=pendCheck]');
  await page.waitForTimeout(400);
  assert.match(await page.textContent('#au-msg'), /not confirmed|confirm/i);
  await page.evaluate(() => { handleAuthUrl('junctura://auth/callback#access_token=u-0&refresh_token=r&type=signup'); });
  await page.waitForTimeout(400);
  assert.match(await page.textContent('.auth h1'), /Email confirmed/);
  await page.waitForTimeout(3800);
  assert.equal(await page.evaluate(() => document.getElementById('auth-root').hidden), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('change password asks for the current one', async () => {
  const { page, errors, ctx } = await openApp({ cloud: true });
  await signUp(page, 'Lara Saab', 'lara@example.com');
  await page.click('[data-act=onbStart]:not([data-demo])');
  await page.waitForTimeout(400);
  await page.evaluate(() => go('setup'));
  await page.waitForTimeout(300);
  await page.click('[data-act=changePass]');
  await page.waitForTimeout(300);
  await page.fill('#np-0', 'wrong');
  await page.fill('#np-1', 'newpass123');
  await page.fill('#np-2', 'newpass123');
  await page.click('.modal button[type=submit]');
  await page.waitForTimeout(400);
  assert.match(await page.textContent('#toast'), /current password is not right/);
  await page.fill('#np-0', 'secret123');
  await page.click('.modal button[type=submit]');
  await page.waitForTimeout(500);
  assert.match(await page.textContent('#toast'), /Password changed/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('forgot password: the emailed link signs in', async () => {
  const { page, errors, ctx } = await openApp({ cloud: true });
  await page.evaluate(async () => { await sb().auth.signUp({ email: 'karim@example.com', password: 'secret123', options: { data: { name: 'Karim' } } }); await sb().auth.signOut(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { AUTH_MODE = 'in'; authScreen(); });
  await page.click('[data-act=authMode][data-v=code]');
  await page.fill('#au-email', 'karim@example.com');
  await page.click('#au-go');
  await page.waitForTimeout(500);
  assert.match(await page.textContent('#au-msg'), /tap the link/);
  await page.evaluate(() => handleAuthUrl('junctura://auth/callback#access_token=u-0&refresh_token=r&type=magiclink'));
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => !!SESSION && document.getElementById('auth-root').hidden), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});
