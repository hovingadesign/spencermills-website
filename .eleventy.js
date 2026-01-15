/**
 * 11ty Configuration
 *
 * Features:
 * - Responsive image optimization (eleventy-img)
 * - Dynamic Iconify icon system
 * - HTML minification (production only)
 *
 * CSS is handled by Tailwind CLI (see package.json scripts)
 */

const Image = require("@11ty/eleventy-img");
const { minify: htmlMinify } = require('html-minifier-terser');
const path = require('path');
const fs = require('fs');

// ============================================
// ICONIFY ICON COLLECTOR
// ============================================

const iconCollector = {
  icons: new Map(),

  register(iconId) {
    if (!this.icons.has(iconId)) {
      this.icons.set(iconId, this.fetchIcon(iconId));
    }
  },

  fetchIcon(iconId) {
    try {
      const [iconset, iconname] = iconId.split(':');
      if (!iconset || !iconname) {
        console.warn(`[Iconify] Invalid icon ID: ${iconId}`);
        return null;
      }

      const iconsetPath = path.join(
        __dirname,
        `node_modules/@iconify/json/json/${iconset}.json`
      );

      if (!fs.existsSync(iconsetPath)) {
        console.warn(`[Iconify] Icon set not found: ${iconset}`);
        return null;
      }

      const iconsetData = JSON.parse(fs.readFileSync(iconsetPath, 'utf8'));
      const icon = iconsetData.icons[iconname];

      if (!icon) {
        console.warn(`[Iconify] Icon not found: ${iconId}`);
        return null;
      }

      const width = icon.width || iconsetData.width || 24;
      const height = icon.height || iconsetData.height || 24;

      return {
        body: icon.body,
        viewBox: `0 0 ${width} ${height}`,
        width,
        height
      };
    } catch (e) {
      console.error(`[Iconify] Error fetching ${iconId}:`, e.message);
      return null;
    }
  },

  generateSymbols() {
    if (this.icons.size === 0) {
      return '<!-- No icons registered -->';
    }

    let symbols = [];
    for (const [iconId, iconData] of this.icons) {
      if (!iconData) continue;
      const symbolId = `icon-${iconId.replace(':', '-')}`;
      symbols.push(
        `    <symbol id="${symbolId}" viewBox="${iconData.viewBox}">${iconData.body}</symbol>`
      );
    }

    if (symbols.length === 0) {
      return '<!-- No valid icons found -->';
    }

    return `<svg class="hidden" aria-hidden="true" style="display:none">
  <defs>
${symbols.join('\n')}
  </defs>
</svg>`;
  },

  reset() {
    this.icons.clear();
  }
};

module.exports = function(eleventyConfig) {
  const isProd = process.env.NODE_ENV === 'production';

  // Reset icon collector on each build
  eleventyConfig.on('eleventy.before', () => {
    iconCollector.reset();
  });

  // ============================================
  // PASSTHROUGH COPY
  // ============================================

  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/favicon");

  // ============================================
  // FILTERS
  // ============================================

  eleventyConfig.addFilter("date", (date, format = "long") => {
    const d = new Date(date);
    const options = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      iso: null
    };
    if (format === 'iso') {
      return d.toISOString().split('T')[0];
    }
    return d.toLocaleDateString('en-US', options[format] || options.long);
  });

  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  eleventyConfig.addFilter("slugify", (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  });

  // ============================================
  // IMAGE SHORTCODE
  // ============================================

  eleventyConfig.addShortcode("image", async function(src, alt, sizes = "100vw", widths = [400, 800, 1200, 1600], eager = false) {
    const imagePath = src.startsWith('/') ? path.join("src", src) : src;

    try {
      let metadata = await Image(imagePath, {
        widths: widths,
        formats: ["avif", "webp", null],
        outputDir: "./_site/assets/img/",
        urlPath: "/assets/img/",
        filenameFormat: function (id, src, width, format) {
          const name = path.basename(src, path.extname(src));
          return `${name}-${width}w.${format}`;
        }
      });

      let lowsrc = metadata.jpeg?.[0] || metadata.webp?.[0] || metadata.png?.[0] || metadata.avif?.[0];
      const loadingAttr = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

      return `<picture>
      ${Object.values(metadata).map(formatGroup => {
        const format = formatGroup[0].format;
        const srcset = formatGroup.map(img => `${img.url} ${img.width}w`).join(', ');
        const type = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
        return `<source type="${type}" srcset="${srcset}" sizes="${sizes}">`;
      }).join('\n      ')}
      <img src="${lowsrc.url}" width="${lowsrc.width}" height="${lowsrc.height}" alt="${alt}" ${loadingAttr} decoding="async">
    </picture>`;
    } catch (e) {
      console.warn(`[Image] Failed to process ${src}: ${e.message}`);
      return `<span class="image-error" role="img" aria-label="${alt}">[Image: ${alt}]</span>`;
    }
  });

  // ============================================
  // ICON SHORTCODES
  // ============================================

  eleventyConfig.addShortcode("icon", function(iconId, className = "") {
    if (!iconId.includes(':')) {
      iconId = `lucide:${iconId}`;
    }

    iconCollector.register(iconId);

    const sizeClasses = ['sm', 'md', 'lg', 'xl'];
    let classes = ['shrink-0'];

    if (className) {
      const parts = className.trim().split(/\s+/);
      for (const part of parts) {
        if (sizeClasses.includes(part)) {
          // Map size to Tailwind classes
          const sizeMap = { sm: 'size-4', md: 'size-6', lg: 'size-8', xl: 'size-12' };
          classes.push(sizeMap[part]);
        } else {
          classes.push(part);
        }
      }
    } else {
      // Default: 1em sizing (matches text)
      classes.push('size-[1em]');
    }

    const symbolId = `icon-${iconId.replace(':', '-')}`;
    return `<svg class="${classes.join(' ')}" aria-hidden="true"><use xlink:href="#${symbolId}"></use></svg>`;
  });

  eleventyConfig.addShortcode("iconSymbols", function() {
    return iconCollector.generateSymbols();
  });

  // ============================================
  // HTML MINIFICATION (Production Only)
  // ============================================

  eleventyConfig.addTransform('minify-html', async (content, outputPath) => {
    if (!isProd) return content;

    if (outputPath && outputPath.endsWith('.html')) {
      try {
        return await htmlMinify(content, {
          collapseWhitespace: true,
          conservativeCollapse: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: false,
          sortAttributes: true,
          sortClassName: true,
          minifyCSS: true,
          minifyJS: false
        });
      } catch (e) {
        console.error(`[HTML] Minification Error:`, e.message);
        return content;
      }
    }
    return content;
  });

  // ============================================
  // DEV SERVER CONFIG
  // ============================================

  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
    domDiff: true
  });

  // ============================================
  // DIRECTORY CONFIG
  // ============================================

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data"
    },
    templateFormats: ["liquid", "md", "html"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid"
  };
};
