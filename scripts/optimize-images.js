/**
 * Image Optimization Script
 *
 * Processes all <img> tags in built HTML files and replaces them with
 * optimized responsive <picture> elements using @11ty/eleventy-img.
 *
 * Features:
 * - Generates WebP and AVIF formats
 * - Creates multiple sizes for responsive loading
 * - Preserves original format as fallback
 * - Maintains all original attributes (class, alt, etc.)
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import * as cheerio from 'cheerio';
import Image from '@11ty/eleventy-img';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SITE_DIR = '_site';
const IMAGE_WIDTHS = [400, 800, 1200, 1600];
const IMAGE_FORMATS = ['avif', 'webp', 'auto']; // 'auto' preserves original format

// Images to skip (logos, favicons, small icons)
const SKIP_PATTERNS = [
  /favicon/i,
  /logo/i,
  /icon/i,
];

/**
 * Check if an image should be skipped
 */
function shouldSkipImage(src, width, height) {
  // Skip if matches skip patterns
  if (SKIP_PATTERNS.some(pattern => pattern.test(src))) {
    return true;
  }

  // Skip very small images (likely icons)
  if (width && height && (width < 100 || height < 100)) {
    return true;
  }

  // Skip SVGs (already optimized)
  if (src.endsWith('.svg')) {
    return true;
  }

  // Skip external images
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return true;
  }

  return false;
}

/**
 * Get the source image path relative to project root
 */
function getImagePath(src, htmlFilePath) {
  // Handle absolute paths (starting with /)
  if (src.startsWith('/')) {
    // Try _site directory first (already built)
    const siteImagePath = path.join(SITE_DIR, src);
    if (fs.access(siteImagePath).then(() => true).catch(() => false)) {
      return siteImagePath;
    }
    // Try source directory
    return path.join('src', src);
  }

  // Handle relative paths
  const htmlDir = path.dirname(htmlFilePath);
  return path.join(htmlDir, src);
}

/**
 * Process a single image with eleventy-img
 */
async function processImage(src, htmlFilePath) {
  try {
    const imagePath = getImagePath(src, htmlFilePath);

    // Check if source file exists
    try {
      await fs.access(imagePath);
    } catch {
      console.warn(`  ⚠️  Source image not found: ${imagePath}`);
      return null;
    }

    const imageOptions = {
      widths: IMAGE_WIDTHS,
      formats: IMAGE_FORMATS,
      outputDir: path.join(SITE_DIR, 'assets', 'images', 'optimized'),
      urlPath: '/assets/images/optimized/',
      filenameFormat: (id, src, width, format) => {
        const extension = path.extname(src);
        const name = path.basename(src, extension);
        return `${name}-${width}w.${format}`;
      },
    };

    const metadata = await Image(imagePath, imageOptions);
    return metadata;
  } catch (error) {
    console.warn(`  ⚠️  Error processing ${src}:`, error.message);
    return null;
  }
}

/**
 * Generate HTML for responsive picture element
 */
function generatePictureHtml(metadata, $img) {
  const alt = $img.attr('alt') || '';
  const classes = $img.attr('class') || '';
  const loading = $img.attr('loading') || 'lazy';
  const sizes = $img.attr('sizes') || '100vw';

  // Get the largest image for dimensions
  const largestFormat = metadata[Object.keys(metadata)[0]];
  const largestImage = largestFormat[largestFormat.length - 1];

  let pictureHtml = '<picture>';

  // Add source elements for each format (except the fallback)
  const formats = Object.keys(metadata).filter(fmt => fmt !== 'jpeg' && fmt !== 'png' && fmt !== 'jpg');

  for (const format of formats) {
    const images = metadata[format];
    const srcset = images.map(img => `${img.url} ${img.width}w`).join(', ');
    pictureHtml += `\n  <source type="${images[0].sourceType}" srcset="${srcset}" sizes="${sizes}">`;
  }

  // Add fallback img
  const fallbackFormat = metadata.jpeg || metadata.jpg || metadata.png || metadata[Object.keys(metadata)[0]];
  const fallbackSrcset = fallbackFormat.map(img => `${img.url} ${img.width}w`).join(', ');
  const fallbackSrc = fallbackFormat[fallbackFormat.length - 1].url;

  pictureHtml += `\n  <img src="${fallbackSrc}" alt="${alt}" class="${classes}" loading="${loading}" srcset="${fallbackSrcset}" sizes="${sizes}" width="${largestImage.width}" height="${largestImage.height}">`;
  pictureHtml += '\n</picture>';

  return pictureHtml;
}

/**
 * Process a single HTML file
 */
async function processHtmlFile(filePath) {
  const html = await fs.readFile(filePath, 'utf-8');
  const $ = cheerio.load(html);
  const images = $('img');

  if (images.length === 0) {
    return;
  }

  console.log(`\n📄 Processing ${filePath} (${images.length} images)`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const img of images) {
    const $img = $(img);
    const src = $img.attr('src');

    if (!src) {
      continue;
    }

    // Check if should skip
    const width = parseInt($img.attr('width')) || null;
    const height = parseInt($img.attr('height')) || null;

    if (shouldSkipImage(src, width, height)) {
      console.log(`  ⏭️  Skipped: ${src}`);
      skippedCount++;
      continue;
    }

    // Process the image
    console.log(`  🖼️  Processing: ${src}`);
    const metadata = await processImage(src, filePath);

    if (!metadata) {
      skippedCount++;
      continue;
    }

    // Replace img with picture element
    const pictureHtml = generatePictureHtml(metadata, $img);
    $img.replaceWith(pictureHtml);
    processedCount++;
    console.log(`  ✅ Generated responsive images`);
  }

  // Write updated HTML if any images were processed
  if (processedCount > 0) {
    await fs.writeFile(filePath, $.html());
    console.log(`  💾 Saved (${processedCount} optimized, ${skippedCount} skipped)`);
  } else {
    console.log(`  ℹ️  No images to optimize (${skippedCount} skipped)`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting image optimization...\n');

  // Find all HTML files
  const htmlFiles = await glob(`${SITE_DIR}/**/*.html`);
  console.log(`📂 Found ${htmlFiles.length} HTML files\n`);

  // Process each file
  for (const file of htmlFiles) {
    await processHtmlFile(file);
  }

  console.log('\n✨ Image optimization complete!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { main };
