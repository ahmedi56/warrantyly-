# Warrantyly

Warrantyly keeps every product you own, and the warranty that protects it, in one beautiful place. Snap a photo of your receipt and Warrantyly reads the details for you: product, store, purchase date and how long you're covered.

Mobile warranty assistant: scan receipts, track expiry dates, get repair help and prepare claims.
Built with Expo (React Native + TypeScript) and Expo Router.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android / iOS) to open the app on your phone, or press `w` for the web preview.

## Structure

```
src/
  app/                 Screens (every file is a route)
    welcome.tsx        Welcome / onboarding (/welcome); Home is `/`
    (tabs)/            Home · Products · [Scan] · Support · Profile
    scan.tsx           Camera: receipt photo, QR code, gallery, manual entry
    analyzing.tsx      AI extraction progress (simulated)
    confirm.tsx        Review & edit extracted details, then save
    product/[id].tsx   Product detail (Overview / Guides / Support / Files)
    claim/[id].tsx     "Something broke?" → claim summary to share
    guides.tsx         Guides & tutorials
    assistant.tsx      AI support chat (simulated)
  components/          ui.tsx (Button, Card, Text…), product.tsx (CoverageRing…), fields.tsx
                       icons.ts: every icon, imported one by one (lint-enforced) to keep the web bundle small
  data/                store.tsx (state + AsyncStorage), warranty.ts (date math), demo & guide content
  theme/               Colors, spacing, radius, fonts
```

## What's simulated (next phase)

- **AI receipt extraction** — `src/app/analyzing.tsx` returns `mockExtraction`. Replace with a backend call (e.g. a Supabase Edge Function calling a vision model).
- **AI assistant** — `src/app/assistant.tsx` uses canned answers from `src/data/guides.ts`.

## Reminders

Real local notifications via `expo-notifications` (iOS + Android, works in Expo Go; not on web).

- Each product gets two reminders at 09:00: *N days before expiry* (per-product setting) and *on the expiry day*.
- `src/data/reminders.ts` plans them (pure, testable); `src/notifications.ts` schedules them.
- The schedule is rebuilt whenever products, reminder settings or the Notifications toggle change, so edits and deletions never leave stale alerts. Capped at 60 (iOS allows 64 pending).
- Tapping a reminder opens that product. Profile → *Send test reminder* fires one in 5 seconds.

## Accounts & cloud sync (Supabase)

- **Setup:** put the project URL and *publishable* key in `.env`, then run `supabase/migrations/0001_init.sql` in the Supabase SQL Editor. Without a key the app runs in guest mode (on-device only).
- **Login:** email + 6-digit code (`src/app/login.tsx`). The *Magic Link* and *Confirm signup* email templates must contain `{{ .Token }}`.
- **Security:** Row-Level Security on every table and on the private `receipts` bucket (`<user_id>/<product_id>/…`): users only ever reach their own rows and files.
- **Sync** (`src/data/store.tsx`, `src/data/sync.ts`): changes apply locally first and are queued in an outbox (persisted, idempotent, retried every 60 s and on app resume). A full download runs on launch/resume once the queue is empty. Photos upload to Storage and are shown via signed URLs on other devices.
- **Sign-in** uploads anything created as a guest (demo items are skipped). **Log out** clears the account's data from the phone. **Delete account** removes files, then the user (products/claims cascade).

## Web deployment

- Build: `npm run build:web` → static site in `dist/` (Expo static export).
- Link previews (WhatsApp, iMessage, Facebook, X): description + Open Graph/Twitter tags in `src/components/page-title.web.tsx`, image `public/og-image.jpg` (1200×630, 71 KB). **Set `EXPO_PUBLIC_SITE_URL`** (e.g. `https://app.warrantyly.com`) in `.env` / your host before building; crawlers need the full image URL.
- Unknown URLs: `src/app/+not-found.tsx` is copied to `dist/404.html` after export (`scripts/web-postexport.js`), so hosts return a real 404 with the branded page.
- `scripts/web-postexport.js` also moves `dist/assets/node_modules` to `dist/assets/vendor`: Cloudflare's uploader skips `node_modules` folders, which would leave fonts and icons missing.
- `public/_headers` (security headers + CSP) and `public/_redirects` (dynamic routes) are copied into `dist/` and are read by Cloudflare Pages and Netlify.
- The CSP has **no `unsafe-eval`**. It allows one inline script by hash (Expo Router's hydration flag), `'wasm-unsafe-eval'` for the web QR scanner's WebAssembly, and connections to Supabase only. The scanner's `.wasm` is self-hosted at `/zxing/`, copied from `zxing-wasm` on every install (`scripts/copy-zxing-wasm.js`). If you change the Supabase project, update the URL in `_headers`.
- Reminders (local notifications) are phone-only; `src/notifications.web.ts` makes them no-ops on web.

## Mobile builds (EAS)

- Expo project: `@proassist1/warrantyly`. App ID `com.warrantyly.app` (iOS bundle ID and Android package; permanent once in a store).
- Version: `expo.version` (1.0.0) plus `ios.buildNumber` / `android.versionCode` in `app.json` (`appVersionSource: local`). Bump `versionCode`/`buildNumber` for every store upload.
- Profiles (`eas.json`): `preview` = installable Android APK for testing; `production` = Play Store app bundle (.aab); `development` = dev client.
- Build an APK: `EAS_NO_VCS=1 npx eas-cli@latest build -p android --profile preview` (drop `EAS_NO_VCS=1` once the repo has git commits).
- The Android signing key is generated and stored by EAS on the Expo account; don't lose access to that account.
- Icons: `assets/images/icon.png` (1024, iOS + fallback), `android-icon-{foreground,background,monochrome}.png` (adaptive/themed), `splash-icon.png`.
