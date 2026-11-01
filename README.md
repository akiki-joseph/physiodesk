# PhysioDesk: Android app for a physiotherapy practice

PhysioDesk replaces the email calendar. It keeps the appointments, the clients' files, the treatment notes and the money in one app, for the clinics you work at and for your own clients. It works offline, and the data stays on the phone.

GitHub builds the APK for free in the cloud; nothing needs installing on a computer.

## What it does

**Today (dashboard)**
* The day's sessions, plus "How did these go?" for past sessions still marked as booked. One tap marks a session done and paid, or a no-show, so the numbers stay right.
* Net profit, income, sessions done and money owed, for this week, this month, last month or this year.
* A chart of income, expenses and profit for the last 6 months.
* Income by service, average price per session, no-show rate, new clients and the busiest day.

**Calendar**
* A day view with a timeline (tap an empty time to book it, swipe to change day), plus a month view and a list of the next 30 days.
* Repeating bookings: every week, twice a week, every 2 weeks, every day or every other day, for 2 to 20 sessions.
* A warning when a booking overlaps another one.

**Clinics**
* Add each clinic you work at, with two numbers: the **%** it keeps from your own clients (for example 30%) and the **fixed amount** it pays you for each of its clients (for example $15).
* Each booking says where it happens and whose client it is. The app works out the clinic's share and what you get: a $40 session with your own client gives the clinic $12 and you $28. A clinic's client gives you $15.
* The dashboard and Money screen show your income after the clinics' share, split by clinic.

**Phone calendar and reminders**
* **Import from phone calendar** reads the appointments already in your Google calendar (last 12 months and next 12, repeating ones included) and adds them, with the clinic and service you pick. It never imports the same one twice.
* **Add my sessions to the calendar automatically**: every session you book, move or cancel in PhysioDesk is updated in your Google calendar, so it also shows in Gmail and on your computer.
* **Client reminders**: 1 hour before each session (or 30 min, 2 h, 3 h, or the evening before), the phone shows a notification. Tap it and WhatsApp opens with the reminder typed; tap send. WhatsApp doesn't let apps send messages by themselves, so this last tap is needed.

**Each appointment**
* Its status: booked, done, no-show or cancelled.
* Paid or unpaid, and how: cash, card, bank transfer, wallet app or insurance.
* **Price and cost per session**, so each session shows its own profit (cost covers things like transport for home visits, tape and consumables).
* **WhatsApp reminder** in one tap from the appointment too. Also Call, Book again and Note.

**Clients**
* A file for each client: phone, email, date of birth, condition, who referred them, address and medical notes.
* Sessions done, total paid, what they still owe, and their upcoming and past sessions.
* **Treatment notes** with a 0–10 pain score and optional S/O/A/P headings. A small chart shows how the pain score changes over time.

**Money**
* A profit-and-loss summary for each month: income, session costs, expenses, net profit, collected and not paid yet.
* A list of everyone who owes money, with a one-tap "Paid" button.
* Expenses (rent, equipment, supplies…). Rent can repeat every month.
* **Export spreadsheet**: a CSV file with every session and expense, which opens in Excel or Google Sheets.

**Settings**
* Your name, currency, clinics, services and prices, working hours, 12- or 24-hour clock and the reminder message.
* **PIN lock**: the app asks for the PIN when it opens and after 3 minutes in the background.
* **Backup and restore**: a backup file you can send to Google Drive, email or WhatsApp, and restore on a new phone.
* Sample data to try the app with, which you can remove in one tap.

## Getting the APK

Gi## Getting the APK

GitHub builds `PhysioDesk.apk` every time something changes on `main` (the **Build PhysioDesk APK** run in the **Actions** tab, about 5–8 minutes). To build again without changing anything, open **Actions → Build PhysioDesk APK → Run workflow**.

1. On the phone, open this repo on github.com and sign in → **Releases** → the newest **PhysioDesk build N** → tap **PhysioDesk.apk**.
2. Open the downloaded file, allow installs from this source, then tap **Install**. If Play Protect warns about an unknown app, tap **More details → Install anyway** (it warns because the app isn't from the Play Store).

Updates install over the old app and keep all the data, because every build is signed with the same key.

## Keep the repo private

* The `keystore` folder holds the app's signing key. Anyone who has it can build an "update" the phone would accept.
* Keep a copy of the `keystore` folder somewhere safe. If the key is lost, the phone has to uninstall the app before it can install a new build, and uninstalling **deletes all the app's data** (back up first).
* To keep the key out of the repo, add it as a secret instead. Turn it into text (Mac: `base64 -i keystore/debug.keystore | pbcopy`), then go to **Settings → Secrets and variables → Actions → New repository secret**, name it `KEYSTORE_BASE64` and paste. After that you can delete the `keystore` folder from the repo.

e email calendar

1. On a computer, open **calendar.google.com → ⚙ Settings → Import & export → Export**. This downloads a zip with one `.ics` file per calendar. (In Outlook: **File → Save Calendar**.)
2. Send the `.ics` file to the phone, for example by email or WhatsApp to yourself.
3. In PhysioDesk, open **Settings → Import Google / Outlook calendar** and pick the file.
4. Choose the service and price to use, and whether past appointments count as done and paid. Then tap **Import**.

Appointments from the last 12 months and the next 12 months come in. Weekly repeating events are expanded into separate sessions. Importing the same file twice doesn't create duplicates.

## Moving over from the email calendar

1. Make sure the Gmail account is on the phone (phone **Settings → Accounts**) and its calendar syncs.
2. In PhysioDesk open **Settings → Phone calendar → Import from phone calendar** and allow calendar access.
3. Pick the calendar with your Gmail address, the clinic, whose clients they are and the service. Then tap **Import**.
4. To keep the calendar up to date from now on, tick **Add my sessions to the calendar automatically** and pick the same calendar.

No Gmail on the phone? On a computer, export the calendar from **calendar.google.com → ⚙ Settings → Import & export → Export**, send the `.ics` file to the phone and use **From a file (.ics)**.

## Keep a backup

All the data lives inside the app on that one phone. If the phone is lost, or the app is uninstalled, the data goes with it. The Today screen reminds you when the last backup is more than 14 days old.

To back up, tap **Back up** and save the file to Google Drive, or email it to yourself. On a new phone, install the app, then go to **Settings → Restore a backup**.
