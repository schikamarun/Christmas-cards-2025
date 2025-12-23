# Christmas Cards 2025 — “Winter Mail” (GitHub Pages)

A premium, mobile-first “virtual greeting card in an envelope” microsite.

- **Primary personalization method:** hash routes like `/#/anna` (or collection routes like `/#/collection/christmas-2025/anna`)
- **Static hosting:** works on GitHub Pages and any static server (nginx/Caddy/Apache)
- **No build tools:** vanilla HTML/CSS/JS only

## Quick start (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default branch)
   - **Folder:** `/ (root)`
4. Wait for GitHub Pages to deploy.

Open the deployed URL:
- Generic: `https://<user>.github.io/<repo>/#/`
- Recipient (default collection): `https://<user>.github.io/<repo>/#/anna`
- Recipient (specific collection): `https://<user>.github.io/<repo>/#/collection/christmas-2025/anna`

## Personalization, routing, and data

### Hash routing rules

Supported routes:
- `/#/` → generic landing
- `/#/collection/<collectionSlug>` → collection landing (generic card styled by collection)
- `/#/<recipientSlug>` → recipient in the **default collection**
- `/#/collection/<collectionSlug>/<recipientSlug>` → recipient in a specific collection

If a route doesn’t match or the recipient slug isn’t found, the site falls back to the generic card.

### Data files

- `data/collections.json`

  ```json
  {
    "christmas-2025": {
      "title": "Merry Christmas 💌",
      "subtitle": "A little letter for you",
      "defaultTheme": "classic",
      "footerNote": "Wishing you warmth and light this season."
    }
  }
  ```

- `data/recipients.json`

  ```json
  {
    "defaultCollection": "christmas-2025",
    "recipients": {
      "christmas-2025": {
        "anna": {
          "name": "Anna",
          "message": "…",
          "signature": "— Dominik",
          "theme": "classic",
          "date": "2025-12-24"
        }
      }
    }
  }
  ```

### Themes

Supported themes:
- `classic` (cream + evergreen + subtle gold)
- `midnight` (near-black winter sky + icy highlight + warm candle glow)
- `festive` (refined warm reds)

You can set a collection `defaultTheme` and optionally override per recipient.

## Admin tool (sender-only)

Open `admin.html` locally or from the deployed site.

Important warning: **admin.html is not protected; don’t store secrets. GitHub Pages is public.**

What it does:
- Create or edit a collection (title/subtitle/default theme/footer note)
- Add recipients (multi-paragraph messages supported)
- Auto-generate slugs from names with collision handling
- Import a CSV-like list (one per line):
  - `Name | Message | Signature | Theme | Date`
- Output:
  - JSON for `collections.json`
  - JSON for `recipients.json`
  - Recipient links (hash routes)
  - WhatsApp-ready message text (bulk copy)

If the site is served over HTTP(S), `admin.html` will try to load existing `data/*.json` and **merge** updates so you don’t lose other collections.

## WhatsApp preview / Open Graph notes

WhatsApp (and many scrapers) **ignore the hash fragment** (`#...`). That means:
- Preview images/titles/descriptions are **generic** (not per-recipient)
- This project intentionally ships a single beautiful preview image

If WhatsApp keeps showing an old preview:
- Previews can be cached for a long time.
- Changing the OG image filename (e.g. `og-image-v2.png`) often forces a refresh.

## Replacing the OG image

- `assets/og-image.svg` is the editable source.
- `assets/og-image.png` is used by Open Graph and Twitter tags.

If you edit the SVG, export to PNG at **1200×630** and overwrite `assets/og-image.png`.

## Local preview (file://)

You can open `index.html` directly with `file://`.

Because browsers often block `fetch()` from `file://`, the app will:
- fall back to embedded sample data
- show a small “Local preview mode” note

To preview with real data locally, run a tiny static server (any of these):
- Python: `python -m http.server 8000`
- Node: `npx serve .`

Then open: `http://localhost:8000/#/`

## Raspberry Pi hosting notes

Any static web server works.

### Caddy (simple)

Serve this folder as static files:

```caddyfile
example.com {
  root * /var/www/winter-mail
  file_server
  header {
    Cache-Control "public, max-age=3600"
  }
}
```

### nginx (common)

```nginx
server {
  listen 80;
  server_name example.com;

  root /var/www/winter-mail;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
    add_header Cache-Control "public, max-age=3600";
  }
}
```

### Base path considerations

This project uses **relative paths** for assets and JSON, so it works when hosted at:
- `/` (root)
- `/<repo>/` (GitHub Pages repo subpath)

## Troubleshooting

- **GitHub Pages propagation:** deployments can take a few minutes.
- **WhatsApp preview caching:** can be stubborn; change OG image filename to refresh.
- **Mobile Safari:** if something feels “stiff,” check iOS Low Power Mode and `prefers-reduced-motion`.
