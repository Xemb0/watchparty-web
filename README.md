# WatchParty — Web

Standalone site for **WatchParty** (synchronized video watching + WebRTC voice/video), ready to deploy on Netlify.

## Structure

- `index.html` — marketing landing page (Tailwind via CDN, no build step).
- `/app/` — the compiled Kotlin Multiplatform WatchParty web app (Compose/WASM). The "Launch Web App" button on the landing page opens it.
- `privacy-policy.html`, `terms-of-service.html`, `contact.html` — legal/contact pages.
- `js/` — `supabase-config.js` (browser-public anon key) + `gallery.js`.
- `netlify.toml` — WASM mime type, long-cache for hashed bundles, and the SPA fallback for the app's client-side router (translated from the original Apache `.htaccess`).

## Deploy to Netlify

1. Connect this repo to Netlify (New site → Import from Git → pick this repo).
2. Build command: *none*. Publish directory: `.` (already set in `netlify.toml`).
3. Deploy. Landing page serves at `/`, the app at `/app/`.

Static site — pushing to the default branch auto-deploys.

> The Supabase key in `js/supabase-config.js` is a public anon/publishable key meant to live in the browser (same as the live imautotech.in site). Row-level security on the backend is what protects data, not this key.
