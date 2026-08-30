# Health OS deployment

## 1. GitHub
Create an empty repository and upload the contents of this folder to its root. Do not nest the `health-os-v1.9` folder.

The workflow `.github/workflows/ci.yml` runs on every push/PR to `main`:
- `npm ci`
- `npm test`
- `npm run build`
- migration presence checks
- Capacitor doctor
- Android debug build once the generated `android/` project is committed

Do not merge a red CI run.

## 2. Supabase
Create the project in an EU region. Apply `supabase/migrations/001...014` in order.

Copy `.env.example` to `.env` locally and set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is expected in a client app; security must come from RLS. Never place the service-role key in Vite/Netlify/Android client variables.

## 3. Netlify
Import the GitHub repository.

`netlify.toml` already configures:
- build: `npm run build`
- publish: `dist`
- Node 22
- SPA fallback to `index.html`

In Netlify Site configuration → Environment variables add the same two `VITE_...` variables. Deploy `main`.

## 4. Android / Health Connect
On a development machine with Android Studio/JDK installed:

```bash
npm ci
npm run build
npx cap add android
npx cap sync android
```

Then integrate the checked-in native scaffold:
- `native/android/health-connect/HealthConnectPlugin.kt`
- `native/android/health-connect/AndroidManifest-snippet.xml`
- `native/android/health-connect/gradle-snippet.txt`

Commit the generated `android/` directory after it builds locally. From then on GitHub Actions will run `assembleDebug` too.

## First real-data milestone
Do not activate Aging/Pace/Decision outputs as real-user conclusions yet. First prove:

`Health Connect → source_records → normalizer → observation/sleep_session → Supabase → Today UI`

Start with one real record and preserve its provider, external ID, source-record link, UTC/local timing, physiological date and normalizer version.
