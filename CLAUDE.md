# Junctura

Practice app for physiotherapists (appointments, clients, notes, home exercises, income, invoices), built for a physiotherapist in Lebanon and heading for Google Play. Android app via Capacitor; cloud accounts and sync via Supabase; a small website on GitHub Pages for the client exercise page.

## Working with the owner

The owner is not a developer and follows along on a phone. Explain in plain words what changed and what they must do, with exact clicks. They merge through GitHub compare links (`https://github.com/akiki-joseph/physiodesk/compare/main...<branch>`), so end a piece of work with that link. Commit to a `claude/…` branch; `main` holds the owner's own merge commits, which stay as they are.

A therapist already uses the app daily with real patient data. Every change keeps that data readable: the localStorage keys (`physiodesk.v1`, `.auth`, `.sync`, `.pending`) and the PIN salt `physiodesk:` keep their old names on purpose, and a change to the shape of `S` ships with code that upgrades old data.

## Layout and traps

- `www/index.html` is the whole app (one file, plain JS). State lives in `S`; clicks, forms and inputs go through the `ACT`, `FORMS`, `INPUT` and `CHANGE` maps; `render()` redraws the page. `CFG` and other cloud code are declared near the end of the script, so code that runs at load time reads `window.PD_CONFIG` directly.
- `www/anim.js` draws the exercise figures and is shared with the client page (`site/p/`): a change there changes what clients see. `www/exercises.js` is the 800-exercise catalogue.
- `site/` is the website. `.github/workflows/site.yml` adds the app's `anim.js`, `exercises.js`, `config.js` and fonts and publishes it; GitHub only publishes from `main`, and the publish step must stay a separate job after the upload.
- `native/` holds the Java plugins (calendar, SMS); `.github/workflows/build-apk.yml` creates the Android project, copies them in and patches the manifest, in two versions. **direct** (`Junctura.apk`, signed with the old debug key so it installs over the therapist's app) keeps automatic SMS reminders; a push to `main` publishes it as a release. **play** (`Junctura.aab` for Google Play) leaves out SMS and exact alarms, which Play refuses for an app that isn't the phone's SMS app, and is signed with the upload key from the `UPLOAD_KEYSTORE_BASE64` / `UPLOAD_KEYSTORE_PASSWORD` secrets. The web code tells them apart by whether the `PhysioSms` plugin exists (`smsAvailable()`).
- Android 15+ draws the app under the status and navigation bars: spacing at the screen edges uses `--sat`, `--sab`, `--sal`, `--sar` (fed by Capacitor's `--safe-area-inset-*`).
- `site/privacy.html`, `terms.html` and `delete-account.html` are the pages Google Play links to; when the app's data handling changes, update them in the same change.

## Verify

`npm test` runs the app and the client page in Chromium against a fake Supabase (`tests/fake-supabase.js`); `npm run test:db` checks the database access rules on a real Postgres (`DATABASE_URL`). Both run on every push (`.github/workflows/tests.yml`). New behaviour gets a test in `tests/`; a new table or rule gets a check in `tests/db/rules.sql`.

## Cloud and secrets

`www/config.js` holds the Supabase URL and the publishable key, which are public by design. The service-role key, the database password and email-provider keys stay with the owner in the Supabase dashboard; when a task needs one, the owner runs that step themselves. The signing key lives only in the GitHub secret `KEYSTORE_BASE64`.

Database changes go into `supabase/schema.sql`, written to be safe to run again; then give the owner the new SQL to paste into Supabase → SQL Editor → Run.
