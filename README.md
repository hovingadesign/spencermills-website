# Spencer Mills OPC Website

Static website for Spencer Mills Orthodox Presbyterian Church, built with 11ty (Eleventy) and Tailwind CSS v4.

## Quick Start

```bash
npm install
npm run dev        # Start dev server (http://localhost:8080)
npm run build:prod # Production build (CSS + HTML + images)
npm run preview    # Build and serve locally on port 3000
```

## Deployment

The site is deployed via **Cloudflare Pages** from the `master` branch.

### GitHub Actions CI/CD

A GitHub Actions workflow (`.github/workflows/build-deploy.yml`) automates builds:

| Trigger | When | Purpose |
|---------|------|---------|
| **Push to master** | Any source file change | Rebuild after content/template updates |
| **Daily schedule** | 6:00 AM Eastern (11:00 UTC) | Refresh calendar data from ICS feed |
| **Manual** | GitHub Actions tab > "Run workflow" | On-demand rebuild |

**How it works:**
1. Checks out `master`, installs deps, runs `npm run build:prod`
2. If `_site/` changed, commits and pushes with `[skip ci]` to avoid loops
3. Cloudflare Pages auto-deploys from the updated `master` branch

**Note:** Since the Action commits `_site/` back to `master`, always `git pull` before pushing local changes to avoid conflicts.

### Local Development Workflow

1. Edit source files in `src/`
2. Preview locally with `npm run dev` or `npm run preview`
3. Push source changes to `master` — the Action handles building and deploying

You do not need to commit `_site/` locally; the Action rebuilds it on every push.

## Project Structure

```
src/
├── _data/
│   ├── calendar.js      # ICS calendar feed (21-day lookahead, 4 events)
│   ├── sermons.js       # SermonAudio RSS feed ingestion
│   └── site.js          # Global site configuration
├── _includes/
│   ├── layouts/
│   │   └── base.liquid  # Base HTML template
│   ├── header.liquid    # Navigation header
│   └── footer.liquid    # Site footer
├── assets/
│   ├── css/main.css     # Tailwind entry + brand theme
│   ├── fonts/           # Self-hosted WOFF2 (Cormorant, Roboto)
│   ├── images/          # Source images
│   └── favicon/
├── index.liquid         # Homepage (hero, calendar widget, contact form)
├── sermons.liquid       # Sermon archive with filtering
├── beliefs.liquid       # Doctrinal beliefs
├── leadership.liquid    # Leadership team
├── contact.liquid       # Contact form
├── give.liquid          # Giving page
├── visitor.liquid       # Visitor info card
└── the-opc.liquid       # OPC denomination info

scripts/
└── optimize-images.js   # Post-build AVIF/WebP/JPEG optimization

.github/
└── workflows/
    └── build-deploy.yml # CI/CD pipeline
```

## Data Sources

| Data | Source | Refresh |
|------|--------|---------|
| **Calendar** | Outlook 365 ICS feed | Every build (daily via Action) |
| **Sermons** | SermonAudio RSS feed | Every build (1-day cache via eleventy-fetch) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server at localhost:8080 with live reload |
| `npm run build` | Build CSS + HTML |
| `npm run build:prod` | Production build (minified HTML + image optimization) |
| `npm run build:images` | Image optimization only |
| `npm run preview` | Production build + serve on port 3000 |
| `npm run clean` | Remove `_site/` |
