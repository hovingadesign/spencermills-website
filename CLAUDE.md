# CLAUDE.md

Guidance for Claude Code when working with this Spencer Mills OPC website repository.

## Quick Start

```bash
npm install              # Install dependencies
npm run dev            # Development server with live reload
npm run build          # Build CSS + HTML (no image optimization)
npm run build:prod     # Production build WITH image optimization
npm run preview        # Serve build:prod output on port 3000
npm run build:images   # Image optimization script (runs after build:prod)
```

## Architecture Overview

This is an 11ty (Eleventy) static site with Tailwind CSS v4 using **ES modules** (not CommonJS), featuring:

1. **Sermon Archive**: Dynamic RSS feed ingestion from SermonAudio with automatic filtering
2. **Responsive Images**: Automatic next-gen optimization (AVIF/WebP/JPEG) across 4 breakpoints (400w-1600w)
3. **Dynamic Audio Players**: Lazy-loaded audio elements that initialize on button click
4. **Self-Hosted Assets**: All fonts and images served locally (no external CDN)
5. **Church Calendar**: 7-day event lookahead from ICS feed

## ES Modules Configuration

**Important**: This project uses ES modules (`"type": "module"` in package.json). All JavaScript files use:
- `import` instead of `require()`
- `export default` instead of `module.exports`
- Special imports for certain packages:
  - `cheerio`: Use `import * as cheerio from 'cheerio'`
  - `rrule`: Use `import rrule from 'rrule'; const { RRule } = rrule;`

See package.json, .eleventy.js, and all _data/*.js files for examples.

## File Structure

```
package.json                 # "type": "module" for ES modules
tailwind.config.js           # Tailwind v4 content paths for CSS purging

src/
├── _data/
│   ├── sermons.js           # RSS feed ingestion, scripture normalization, filtering data
│   ├── calendar.js          # ICS calendar with 7-day lookahead
│   └── site.js              # Global configuration
├── _includes/
│   └── header.liquid        # Navigation header with inline SVG hamburger
├── assets/
│   ├── css/
│   │   └── main.css         # Tailwind import + @font-face declarations
│   └── fonts/               # Local WOFF2 files (Cormorant, Roboto)
├── sermons.liquid           # Sermon archive with 4-way filtering UI
├── beliefs.liquid           # Beliefs page (tall hero image: h-[32rem] sm:h-[40rem])
└── index.liquid             # Homepage (Live Stream button: text-spruce)

scripts/
└── optimize-images.js       # Post-build image processing script

_site/                        # Build output (INCLUDED in git)
├── assets/
│   ├── css/main.css         # Minified Tailwind CSS
│   ├── fonts/               # Self-hosted WOFF2 files
│   └── images/optimized/    # Generated responsive images (4 sizes, 3 formats each)
└── *.html                    # Built pages
```

## Key Concepts

### 1. Sermon Data Pipeline (`src/_data/sermons.js`)

**Process:**
1. Fetches SermonAudio RSS feed via @11ty/eleventy-fetch with 1-day cache
2. Maps RSS fields: `content` → scripture references, `pubDate` → date, `enclosure.url` → audio URL
3. Normalizes scripture references to full book names (Genesis, Ephesians, etc.)
4. Extracts unique speaker names, book names, and years for filter dropdowns
5. Alphabetizes all filter values with custom sort for numbered books (1 John before 2 John)
6. Returns array of sermon objects with metadata for template rendering

**Important Field Mapping:**
- Scripture is in `item.content` (not `description`)
- Audio URL is in `item.enclosure.url`
- Duration is in `item.itunes:duration`
- Speaker is extracted from title (e.g., "Speaker Name - Title")

**Scripture Normalization:**
- Maps all Bible book variations to canonical names (gen, genesis, Gen → Genesis)
- Handles common misspellings (Galations → Galatians, Phillipians → Philippians)
- Returns full names only (never abbreviated form)

### 2. Responsive Images (`scripts/optimize-images.js`)

**Post-Build Processing:**
1. Runs AFTER eleventy generates HTML files
2. Parses all HTML files in `_site/` directory
3. Finds all `<img>` tags and skips: logos, icons, SVGs, external images, images <100px
4. For each qualifying image:
   - Calls @11ty/eleventy-img with widths: [400, 800, 1200, 1600]
   - Generates formats: AVIF, WebP, original (JPEG/PNG)
   - Outputs to `_site/assets/images/optimized/`
5. Replaces `<img>` with `<picture>` element containing `<source>` tags for each format

**Example Output:**
```html
<picture>
  <source type="image/avif" srcset="/assets/images/optimized/Image-400w.avif 400w, ..." sizes="100vw">
  <source type="image/webp" srcset="/assets/images/optimized/Image-400w.webp 400w, ..." sizes="100vw">
  <img src="/assets/images/optimized/Image-1600w.jpeg" srcset="..." sizes="100vw" width="1600" height="1067">
</picture>
```

**Performance:** Reduces image file size by 60-75% (AVIF particularly effective for photos)

### 3. Dynamic Audio Players (`src/sermons.liquid`)

**Pattern:**
- Sermon cards have "Listen Now" button (not embedded audio)
- Button click creates `<audio>` element and opens player UI
- Player has play/pause controls and close button
- Only one audio player active at a time (pauses previous when starting new)

**Why:** Prevents page bloat (100 sermon pages would load 100+ audio elements)

### 4. Fonts (`src/assets/css/main.css` + `src/assets/fonts/`)

**System:**
- Self-hosted WOFF2 files in `src/assets/fonts/`
- @font-face declarations in `main.css`:
  - Cormorant Garamond: weights 400, 500, 600, 700 (serif headlines)
  - Roboto: weights 300, 400, 500 (sans-serif body)
- Both fonts use `font-display: swap` for fast text rendering

**Dev vs Prod:**
- **Dev mode** (`npm run dev`): Uses minified Tailwind CSS from build output (includes fonts via @font-face)
- **Fallback** (`src/_includes/base.liquid`): Inline @font-face for dev environments that don't have minified CSS yet

### 5. Tailwind CSS v4 Optimization (`tailwind.config.js`)

**Production Build Process:**
- `tailwind.config.js` defines content paths for class scanning
- Tailwind CLI scans all files matching patterns: `./src/**/*.{html,liquid,md,js}`
- Only classes found in source files are included in final CSS
- `build:prod` with `--minify` flag produces ~24KB minified CSS (vs 200KB+ unoptimized)

**Content Paths:**
```javascript
content: [
  './src/**/*.{html,liquid,md,js}',
  './src/_includes/**/*.{html,liquid,md}',
  './_site/**/*.html'
]
```

**Why This Matters:**
- Without config file, Tailwind includes ALL utility classes (huge CSS file)
- With proper content paths, only used classes are included
- Result: Faster page loads, smaller bundle size

## Common Tasks

### Add a New Page

1. Create `.liquid` file in `src/`:
   ```liquid
   ---
   title: Page Title
   ---
   <h1>{{ title }}</h1>
   ```
2. Build: `npm run build`
3. Preview: `npm run preview`

### Update Sermon Feed URL

1. Edit `src/_data/sermons.js` line ~15: Change `FEED_URL` constant
2. Clear cache: Delete `.cache/` directory
3. Rebuild: `npm run build`

### Change Image Optimization Settings

1. Edit `scripts/optimize-images.js`:
   - Line 22: `IMAGE_WIDTHS` array for responsive sizes
   - Line 23: `IMAGE_FORMATS` array for output formats (avif, webp, auto/original)
   - Lines 26-30: `SKIP_PATTERNS` regex for images to exclude

### Adjust Responsive Breakpoints

- 11ty/Eleventy: Uses Tailwind's default breakpoints (sm:640px, md:768px, lg:1024px, xl:1280px)
- Edit `tailwind.config.js` to customize
- Remember: Base classes apply to all sizes; prefixed classes apply "at breakpoint AND ABOVE"

### Debug Scripture Extraction

If sermon scripture is missing or incorrect:
1. Check RSS feed in browser: https://www.sermonaudio.com/rss.xml (or applicable feed URL)
2. Search for scripture in `<content>` field (not `description`)
3. If field is different, update `src/_data/sermons.js` field mapping

## Known Issues and Fixes

### Images Not Optimizing
- **Cause**: `npm run build:prod` doesn't automatically run image optimization
- **Fix**: Use `npm run build:prod` which includes `npm run build:images` in the script
- **Verify**: Check `_site/assets/images/optimized/` for generated files

### Scripture Book Names Truncated
- **Cause**: Normalization function returning abbreviations instead of full names
- **Fix**: `src/_data/sermons.js` has comprehensive book name mapping with fallback matching
- **Verify**: Filter dropdown shows "Ephesians" not "Eph"

### Mobile Hamburger Icon Not Showing
- **Cause**: Icon shortcode symbol not rendering on mobile
- **Fix**: `src/_includes/header.liquid` uses inline SVG (three horizontal lines)
- **Verify**: Mobile nav works at 320px viewport

### Audio Not Playing from Sermon Cards
- **Cause**: Audio element created but URL is invalid or cross-origin
- **Fix**: Check `src/_data/sermons.js` - ensure `item.enclosure.url` is properly mapped
- **Verify**: Audio URLs in sermon data are HTTPS and from same domain or CORS-enabled

### Fonts Not Loading in Build
- **Cause**: @font-face paths pointing to wrong directory or WOFF2 files missing
- **Fix**: Check `src/assets/css/main.css` - paths should be `/assets/fonts/filename.woff2`
- **Verify**: WOFF2 files exist in `src/assets/fonts/`

## Development Notes

### Caching
- Sermon RSS: 1-day cache in `.cache/` directory (delete to force refresh)
- Calendar ICS: Cached separately
- Clear all caches: `rm -rf .cache/`

### Tailwind CSS v4
- **Config required**: `tailwind.config.js` with content paths for proper CSS purging
- Uses `@import "tailwindcss"` syntax (not `@tailwind` directives from v3)
- Opacity modifiers use `/` syntax: `bg-blue-500/50` (not `bg-opacity-50`)
- Arbitrary values use `_` for spaces: `grid-cols-[1fr_2fr_1fr]` (not spaces)
- Production builds automatically purge unused classes when `--minify` flag is used

### ES Modules
- All JavaScript files use ES module syntax (import/export)
- package.json has `"type": "module"` which makes Node.js treat .js files as ES modules
- Some packages require special import syntax (see ES Modules Configuration section above)

### No Framework Dependencies
- Filtering uses vanilla JavaScript with data attributes (no React, Vue, etc.)
- Audio player is vanilla JavaScript with standard HTML5 `<audio>` element
- This keeps bundle size minimal and site fast

### Image Paths
- Internal links use `/` paths: `/assets/images/optimized/image.jpg`
- Never use relative paths that depend on current page location
- All image processing assumes absolute paths from site root

## Performance Considerations

1. **Sermon Page Load**: 100 sermon items with filters (~200KB gzipped)
2. **Image Sizes**:
   - AVIF: ~35KB (1600w sanctuary)
   - WebP: ~70KB (1600w sanctuary)
   - JPEG: ~140KB (1600w sanctuary)
3. **Fonts**: ~155KB total for all weights and styles
4. **Build Time**: ~3-5 seconds for full build + image optimization

## When to Contact Developers

- RSS feed format changed or new field structure needed
- Different image processing (aspect ratios, different sizes)
- Calendar integration needs different logic (more than 7 days, different filtering)
- Audio player behavior needs to change (autoplay, different UI, etc.)

## Commit History

Initial commits focused on:
1. Sermon archive with RSS ingestion and filtering
2. Scripture normalization and alphabetization
3. Dynamic audio player implementation
4. Mobile UI fixes (hamburger icon, hero images)
5. Font system conversion to self-hosted
6. Image optimization pipeline setup
