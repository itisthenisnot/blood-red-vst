# Blood Red VST

A small offline-capable web app (PWA) for discovering **unusual music-production tools**:

- **Windows VST3/CLAP plugins** for **Bitwig Studio 6**, each with Bitwig-specific tips
- **Android music apps**, with notes on getting their output into Bitwig

The catalog favors tools you haven't seen in every "top 10 plugins" list: granular, glitch and time effects,
spectral processing, AI and generative tools, physical modeling, and odd synths. Each entry has a 1–5
uniqueness rating, and "Obscure only" hides anything rated below 4.

## Features

- Windows VST / Android / Saved tabs
- Search, plus filters for category, price and **CLAP only**. Bitwig supports CLAP natively, including per-voice modulation.
- "Surprise me" opens a random entry from the current filter
- Mark entries ♥ favorite, ✓ own, ★ wishlist (stored on your device), and export or import them as JSON
- Installable on Android (Chrome → *Add to Home screen*) and on Windows (Edge/Chrome → *Install app*). Works offline after the first visit.

## Run locally

No build step. Serve the folder with any static server:

```sh
python -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk won't work, because the browser blocks `fetch()` of the JSON files.

## Host it

Turn on GitHub Pages: *Settings → Pages → Deploy from branch → `main` / root*.

## Add or edit entries

Edit `data/vst.json` or `data/android.json`, then run:

```sh
node scripts/validate.mjs
```

| field | notes |
|---|---|
| `id` | kebab-case, unique |
| `category` | ids from `data/categories.json` |
| `formats` | VST only: `"VST3"`, `"CLAP"` |
| `price` | `free` / `freemium` / `paid`, with optional `priceNote` |
| `uniqueness` | 1 (well known) to 5 (genuinely strange) |
| `bitwigTips` | how to get the most out of it in Bitwig 6 |
| `verified` | `true` only once format and price have been checked against a live source |

Formats and prices change. Entries without the *checked* badge haven't been verified yet, so confirm details
on the developer's site before buying. After changing data, bump `CACHE` in `sw.js` so installed copies refresh.
