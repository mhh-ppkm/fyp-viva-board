# FYP Viva Board (EMD/EPD 462)

Viva schedule board for the School of Mechanical Engineering, USM. It runs on GitHub Pages, with live data in Firebase.

- Lecturers pick their name and see every viva they supervise or examine, with photos.
- All rooms for a day sit side by side. On a phone, the rooms are stacked as cards.
- The board checks for clashes automatically: a lecturer double-booked, a room double-booked, a lecturer marked unavailable, or a viva outside the planned hours.
- Clerks can move a viva, change the room, swap the examiner and mark lecturers unavailable. Everyone sees each change straight away, and every change is logged.

**Privacy:** this repository holds code only. Student names, the schedule and staff photos are stored in Firestore. Only signed-in `@usm.my` and `@student.usm.my` accounts can read them, and only clerks and admins can change them. Never commit `viva-seed.json`; `.gitignore` already excludes it.

## One-time setup (about 20 minutes)

### 1. Firebase project (free Spark plan)
1. Go to https://console.firebase.google.com and click **Add project**, e.g. `fyp-viva-board`. Google Analytics is not needed.
2. Click **Project settings → Your apps → Web (</>)** and register the app.
3. Copy the `firebaseConfig` values into `config.js`.

### 2. Sign-in
1. Go to **Build → Authentication → Get started → Sign-in method → Google** and enable it.
2. Go to **Authentication → Settings → Authorized domains → Add domain** and add `mhh-ppkm.github.io`.

### 3. Database
1. Go to **Build → Firestore Database → Create database**. Choose production mode and the region `asia-southeast1` (Singapore).
2. In the **Rules** tab, replace everything with the contents of `firestore.rules`, then click **Publish**.
3. In the **Data** tab, make yourself admin:
   - Start a collection with the ID `roles`.
   - Use the document ID `mhafizhassan@usm.my` (all lowercase).
   - Add a field named `role` (string) with the value `admin`.

### 4. GitHub Pages
1. On github.com/mhh-ppkm, click **New repository**, name it `fyp-viva-board` and make it Public.
2. Upload `index.html`, `board.js`, `app.js`, `config.js`, `firestore.rules`, `README.md`, `.gitignore` and the `assets/` folder. Do **not** upload `viva-seed.json`.
3. Go to **Settings → Pages → Deploy from a branch** and choose `main` / root.
4. After a minute the site is live at `https://mhh-ppkm.github.io/fyp-viva-board/`.

### 5. Load the schedule
1. Open the site and sign in with mhafizhassan@usm.my.
2. Go to **Admin → Import**, choose `viva-seed.json` and click **Import**.
3. Under **Admin → Give clerk access**, add the clerk's USM email.

## Day-to-day use
- **Lecturers:** share the link. Each lecturer can bookmark their own view, e.g. `…/fyp-viva-board/#MHH`.
- **Clerk:** turn on **Clerk mode**, click a viva, change it, give a reason and click **Save**. Use the free-slot suggestions to find a time when both lecturers and a room are free.
- **New semester:** export the new list to `viva-seed.json` (same format), then in Admin import it and tick **Also clear all amendments**.

## Files
| File | What it is |
|---|---|
| `index.html` | Page layout and styles |
| `board.js` | Room board, lecturer finder, clash checks and clerk editor |
| `app.js` | Google sign-in, roles, loading the schedule, admin tools |
| `config.js` | Your Firebase settings and the allowed email domains |
| `firestore.rules` | Who can read and write (paste into the Firebase console) |
| `assets/` | USM APEX logo |
