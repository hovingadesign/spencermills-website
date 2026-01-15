# 11ty Starter Template

Barebones 11ty (Eleventy) starter with Tailwind CSS v4.

## Features

- **Tailwind CSS v4** - CDN for development, compiled for production
- **Responsive images** - Automatic AVIF/WebP/JPEG via eleventy-img
- **Dynamic icons** - Iconify icon sets loaded at build time
- **HTML minification** - Production-only optimization

## Quick Start

```bash
npm install
npm run dev        # Start dev server (http://localhost:8080)
npm run build:prod # Build for production
```

## Project Structure

```
src/
├── _data/
│   └── site.js           # Site configuration
├── _includes/
│   ├── layouts/
│   │   └── base.liquid   # Base HTML template
│   └── partials/
│       └── icons.liquid  # Icon definitions
├── assets/
│   ├── css/
│   │   └── main.css      # Tailwind entry point
│   ├── fonts/
│   ├── img/
│   └── favicon/
└── index.liquid          # Homepage
```

## Tailwind CSS

**Development:** Uses CDN script (no build step needed)

**Production:** Compiled via `@tailwindcss/cli` with only used classes

### Customizing Theme

Edit `src/assets/css/main.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.45 0.18 265);
  --font-display: 'Your Font', serif;
}
```

For development, mirror settings in `base.liquid`:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: 'oklch(0.45 0.18 265)',
      }
    }
  }
}
```

## Icons

Use the `{% icon %}` shortcode with Iconify:

```liquid
{% icon "lucide:check" %}           {# Default size (1em) #}
{% icon "lucide:check", "sm" %}     {# 16px #}
{% icon "lucide:check", "lg" %}     {# 32px #}
{% icon "lucide:star", "text-yellow-500" %}
```

Browse icons at [icon-sets.iconify.design](https://icon-sets.iconify.design/)

## Images

Use the `{% image %}` shortcode for responsive images:

```liquid
{% image "/assets/img/photo.jpg", "Alt text" %}
{% image "/assets/img/hero.jpg", "Hero", "(min-width: 768px) 50vw, 100vw", [400, 800, 1200], true %}
```

## Adding Pages

Create a `.liquid` file in `src/`:

```liquid
---
layout: base
title: Page Title
description: SEO description
---

<section class="py-16">
  <div class="container mx-auto px-4">
    <h1 class="text-4xl font-bold">Page Title</h1>
  </div>
</section>
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server at localhost:8080 |
| `npm run build` | Build site with CSS |
| `npm run build:prod` | Production build (minified) |
| `npm run clean` | Remove `_site/` |

## Deployment

Build output is in `_site/`. Deploy to any static host:

- Build command: `npm run build:prod`
- Output directory: `_site`
