// Shared set-up for the end-to-end tests: opens the app (www/index.html) in Chromium,
// either on its own (no cloud) or with the fake Supabase in tests/fake-supabase.js.
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const APP = 'file://' + path.join(ROOT, 'www', 'index.html');
const SITE = path.join(ROOT, 'site');
const FAKE = path.join(__dirname, 'fake-supabase.js');
const CLOUD_CONFIG = "window.PD_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseKey:'k',siteUrl:'https://site.example/'}";

let browser;
async function getBrowser() { return browser || (browser = await chromium.launch()); }
async function closeBrowser() { if (browser) await browser.close(); browser = null; }

// opts.cloud: use the fake Supabase. opts.confirm: new accounts must confirm their email first.
async function openApp(opts = {}) {
  const b = await getBrowser();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: opts.cloud ? CLOUD_CONFIG : 'window.PD_CONFIG={}' }));
  await ctx.route('**/vendor/supabase.js', r => r.fulfill({ contentType: 'text/javascript', path: FAKE }));
  if (opts.confirm) await ctx.addInitScript(() => localStorage.setItem('fakeConfirm', '1'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(APP);
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}

// Creates an account in the fake cloud and lands in the app.
async function signUp(page, name = 'Karim Haddad', email = 'karim@example.com', pass = 'secret123') {
  await page.click('[data-act=authMode][data-v=up]');
  await page.fill('#au-name', name);
  await page.fill('#au-email', email);
  await page.fill('#au-pass', pass);
  await page.check('#au-agree');
  await page.click('#au-go');
  await page.waitForTimeout(1200);
}

// Starts the app on its own with the sample practice.
async function startDemo(page, name = 'Karim Haddad') {
  await page.fill('#o-name', name);
  await page.click('[data-act=onbStart][data-demo]');
  await page.waitForTimeout(600);
}

const fakeServer = page => page.evaluate(() => JSON.parse(localStorage.getItem('fakeServer') || '{}'));

module.exports = { ROOT, APP, SITE, getBrowser, closeBrowser, openApp, signUp, startDemo, fakeServer };
