# Atelier

A polished TypeScript React PWA that helps you post photos to Instagram. Pick
one or more pictures on your iPhone, and Atelier asks OpenAI to write a
caption, a set of hashtags, a suggested posting time, and accessibility alt
text — one card per photo.

- Mobile-first, touch-friendly UI tuned for iPhone Safari
- Installable as a PWA (Add to Home Screen) with a proper splash, icons, and
  safe-area handling for notch and home indicator
- Original photos are sent as-is — never resized, recompressed, or stripped of
  metadata by Atelier
- Works with any OpenAI vision-capable model (`gpt-4o-mini` by default)
- Per-image loading and error states, copy-to-clipboard for every field, and
  a one-tap "Copy everything" action
- Offline shell via service worker; API calls are always fresh

## Architecture: why there is no backend

**Short version:** Atelier is a single-user, bring-your-own-key app. The
safest practical architecture is to keep everything on-device and let the
browser talk directly to `api.openai.com` over HTTPS. Adding a backend would
*increase* the attack surface, not shrink it.

**Longer version.** The usual reason not to use API keys from a browser is
that developers embed *their* key in a client they ship to *many* users — any
one of those users can extract it and drain the account. That's not what's
happening here:

- You paste *your own* key into *your own* installed PWA on *your own*
  device.
- The key is stored in `localStorage` under this site's origin, so only this
  origin can read it. It is never transmitted anywhere except in the
  `Authorization` header of HTTPS requests to `api.openai.com`.
- Atelier has no server-side component, so there is no third party that could
  log, mishandle, or be breached to steal your key. A backend proxy would add
  exactly one more party that sees the key.
- The main residual risks (someone with physical access to your unlocked
  phone; a malicious browser extension on this origin) would not be mitigated
  by a backend anyway.

You can view the stored key masked in Settings, replace it at any time, or
remove it from the device in a single tap. Because OpenAI lets you create
multiple keys and revoke them individually, the recommended practice is:

1. Create a dedicated key at
   <https://platform.openai.com/api-keys>
2. Set a small monthly usage limit on that key from the OpenAI dashboard.
3. Paste it into Atelier.
4. If you ever lose your phone, revoke the key from the OpenAI dashboard.

### If you *did* want a backend

If you were going to share this app with other people, you should absolutely
not have them use your key — and also not let them paste their own keys into a
site you host, since the browser on *their* device is fine but your hosting
adds a party they have to trust. The clean shape in that case is:

- A tiny proxy (e.g. a single Cloudflare Worker or Vercel Edge Function) that
  holds one server-side OpenAI key.
- An auth layer in front of it (OAuth, a shared access code, IP allowlist —
  whatever matches your sharing model).
- Per-user rate limits and request-size caps to keep abuse cheap.
- Atelier's `src/lib/openai.ts` would change its `fetch` target from
  `https://api.openai.com/v1/chat/completions` to `/api/generate`, drop the
  `Authorization` header, and the rest of the app stays the same.

This repo is deliberately the single-user version.

## Tech stack

- **Vite** + **React 18** + **TypeScript** (strict)
- **vite-plugin-pwa** (Workbox) for service worker and manifest
- Plain CSS, no runtime styling library (keeps the bundle small and legible)
- No analytics, no trackers, no third-party scripts

## Getting started

### 1. Install

```bash
npm install
```

### 2. Run in dev

```bash
npm run dev
```

Vite prints a `http://` URL and a `http://<LAN-IP>:5173` URL. To test on your
iPhone against your laptop, open the LAN URL in Safari on the phone (both
devices on the same Wi-Fi). Service worker / install-to-home-screen require
HTTPS or `localhost`, so on-phone PWA install won't work against the plain
LAN dev URL — use a production build for that (below).

### 3. Build

```bash
npm run build
npm run preview   # serves the built app
```

### 4. Deploy

The output in `dist/` is a static site. Any static host works:

- **Vercel** / **Netlify** / **Cloudflare Pages** — drop-in, zero config.
- **GitHub Pages** — works but PWA install requires HTTPS (Pages provides it).

Deployment is all that's needed for the PWA to be installable: open the
deployed URL on iPhone Safari → Share → Add to Home Screen.

## How to use on iPhone

1. Open the deployed site in Safari.
2. Tap **Share → Add to Home Screen**. The icon, name, and splash come from
   `manifest.webmanifest`.
3. Launch Atelier from the home screen. First launch asks for your OpenAI
   API key and stores it on the device.
4. Tap **Choose photos** (or **Take a photo**). Atelier generates a card per
   image with caption, hashtags, suggested posting time, and alt text.
5. Copy individual fields, or hit **Copy everything** to paste straight into
   the Instagram composer.

## Customising

- **Model.** Settings → Model. Default is `gpt-4o-mini` (fast, cheap). Any
  vision-capable OpenAI model works; there's a custom input for new model
  ids.
- **Tone, language, audience, hashtag count.** Style & options on the main
  screen. Preferences are saved per-device.

## Files of interest

- `src/lib/openai.ts` — system prompt, request shape, JSON parsing, error
  mapping. This is where you'd swap to a backend proxy.
- `src/hooks/useApiKey.ts` — storage + masking for the API key.
- `src/App.tsx` — image job lifecycle (add, run, retry, remove).
- `vite.config.ts` — PWA manifest, Workbox caching (OpenAI calls are always
  live, never cached).
- `scripts/generate-icons.mjs` — zero-dependency PNG icon generator. Re-run
  it if you change the icon design.

## Regenerating icons

If you change the icon design in `scripts/generate-icons.mjs`:

```bash
node scripts/generate-icons.mjs
```

This rewrites `public/icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, and `apple-touch-icon.png`.

## Privacy

- Your API key lives in `localStorage` under this origin only.
- Your images are read with `FileReader`, encoded as a `data:` URL, and sent
  directly to `api.openai.com`. They are not uploaded anywhere else, not
  stored server-side by Atelier, and not cached in the PWA service worker.
- A `<meta name="referrer" content="no-referrer">` tag means requests to
  OpenAI carry no `Referer` header identifying the deploying site.

## Known limitations

- Very large images (≳ 20 MB each) may be rejected by the OpenAI Chat
  Completions endpoint — Atelier surfaces the error verbatim and lets you
  retry or remove that job.
- Atelier does not (and by design won't) resize images. If you need smaller
  payloads, export a smaller copy from Photos before picking it.
- Instagram itself doesn't have a post-scheduling public API, so
  "suggested posting time" is advisory only — Atelier writes it for you to
  use with Meta's Creator Studio, a scheduler, or just by hand.

## License

MIT. Use, modify, and ship.
