/**
 * Sermons Data
 *
 * Fetches sermon data from the Substack podcast RSS feed at build time.
 * The feed is cached for 1 day to avoid excessive requests.
 *
 * Substack feed format differs from SermonAudio:
 * - Duration is in seconds (not H:MM:SS)
 * - Speaker/author is in dc:creator (not itunes:author per-item)
 * - Scripture references are embedded in description HTML
 */

import EleventyFetch from "@11ty/eleventy-fetch";
import Parser from "rss-parser";

// Spencer Mills OPC Substack podcast feed
const SERMON_FEED_URL = "https://api.substack.com/feed/podcast/8351868.rss";

// Cache duration - how long to cache the feed before refetching
const CACHE_DURATION = "1d";

/**
 * Normalize scripture references with full book names.
 * Handles variations and misspellings in the source data.
 */
function normalizeScripture(text) {
  if (!text || typeof text !== "string") return "";

  const cleaned = text.trim();

  // Map variations/misspellings to canonical full names
  const bookNormalization = {
    genesis: "Genesis",
    gen: "Genesis",
    exodus: "Exodus",
    exod: "Exodus",
    leviticus: "Leviticus",
    lev: "Leviticus",
    numbers: "Numbers",
    num: "Numbers",
    deuteronomy: "Deuteronomy",
    deut: "Deuteronomy",
    joshua: "Joshua",
    josh: "Joshua",
    judges: "Judges",
    judg: "Judges",
    ruth: "Ruth",
    "1 samuel": "1 Samuel",
    "1 sam": "1 Samuel",
    "2 samuel": "2 Samuel",
    "2 sam": "2 Samuel",
    "1 kings": "1 Kings",
    "1 kgs": "1 Kings",
    "2 kings": "2 Kings",
    "2 kgs": "2 Kings",
    "1 chronicles": "1 Chronicles",
    "1 chr": "1 Chronicles",
    "2 chronicles": "2 Chronicles",
    "2 chr": "2 Chronicles",
    ezra: "Ezra",
    nehemiah: "Nehemiah",
    neh: "Nehemiah",
    esther: "Esther",
    esth: "Esther",
    job: "Job",
    psalms: "Psalms",
    psalm: "Psalms",
    ps: "Psalms",
    proverbs: "Proverbs",
    prov: "Proverbs",
    ecclesiastes: "Ecclesiastes",
    eccl: "Ecclesiastes",
    "song of solomon": "Song of Solomon",
    "song of songs": "Song of Solomon",
    song: "Song of Solomon",
    isaiah: "Isaiah",
    isa: "Isaiah",
    jeremiah: "Jeremiah",
    jer: "Jeremiah",
    lamentations: "Lamentations",
    lam: "Lamentations",
    ezekiel: "Ezekiel",
    ezek: "Ezekiel",
    daniel: "Daniel",
    dan: "Daniel",
    hosea: "Hosea",
    hos: "Hosea",
    joel: "Joel",
    amos: "Amos",
    obadiah: "Obadiah",
    obad: "Obadiah",
    jonah: "Jonah",
    micah: "Micah",
    mic: "Micah",
    nahum: "Nahum",
    nah: "Nahum",
    habakkuk: "Habakkuk",
    hab: "Habakkuk",
    zephaniah: "Zephaniah",
    zeph: "Zephaniah",
    haggai: "Haggai",
    hag: "Haggai",
    zechariah: "Zechariah",
    zech: "Zechariah",
    malachi: "Malachi",
    mal: "Malachi",
    matthew: "Matthew",
    matt: "Matthew",
    mark: "Mark",
    luke: "Luke",
    john: "John",
    acts: "Acts",
    romans: "Romans",
    rom: "Romans",
    "1 corinthians": "1 Corinthians",
    "1 cor": "1 Corinthians",
    "2 corinthians": "2 Corinthians",
    "2 cor": "2 Corinthians",
    galatians: "Galatians",
    galations: "Galatians",
    gal: "Galatians",
    ephesians: "Ephesians",
    eph: "Ephesians",
    philippians: "Philippians",
    phillipians: "Philippians",
    phil: "Philippians",
    colossians: "Colossians",
    col: "Colossians",
    "1 thessalonians": "1 Thessalonians",
    "1 thess": "1 Thessalonians",
    "2 thessalonians": "2 Thessalonians",
    "2 thess": "2 Thessalonians",
    "1 timothy": "1 Timothy",
    "1 tim": "1 Timothy",
    "2 timothy": "2 Timothy",
    "2 tim": "2 Timothy",
    titus: "Titus",
    philemon: "Philemon",
    phlm: "Philemon",
    hebrews: "Hebrews",
    heb: "Hebrews",
    james: "James",
    jas: "James",
    "1 peter": "1 Peter",
    "1 pet": "1 Peter",
    "2 peter": "2 Peter",
    "2 pet": "2 Peter",
    "1 john": "1 John",
    "2 john": "2 John",
    "3 john": "3 John",
    jude: "Jude",
    revelation: "Revelation",
    rev: "Revelation",
  };

  // Try to match and normalize the book name
  const lowerText = cleaned.toLowerCase();
  for (const [variant, canonical] of Object.entries(bookNormalization)) {
    if (lowerText.startsWith(variant + " ") || lowerText === variant) {
      const remainder = cleaned.slice(variant.length).trim();
      return canonical + (remainder ? " " + remainder : "");
    }
  }

  // Return original if no match found
  return cleaned;
}

/**
 * Extract scripture reference from Substack description HTML.
 * Substack descriptions contain HTML like: <p>Acts 2:42-47 Sermon</p>
 * We extract the scripture reference from the first text content.
 */
function extractScriptureFromDescription(description) {
  if (!description) return "";

  // Strip HTML tags to get plain text
  const plainText = description.replace(/<[^>]*>/g, "").trim();
  if (!plainText) return "";

  // Match scripture patterns: "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
  // Handles numbered books (1 John, 2 Kings, etc.)
  const scripturePattern = /(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+(?::\d+(?:\s*[-–]\s*\d+(?::\d+)?)?)?)/;
  const match = plainText.match(scripturePattern);

  if (match) {
    return match[0].trim();
  }

  return "";
}

/**
 * Extract book name for filtering/grouping
 */
function extractBook(scripture) {
  if (!scripture) return "";
  // Match book name (including numbered books like "1 Corinthians")
  const match = scripture.match(/^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)/);
  return match ? match[1].trim() : "";
}

/**
 * Format seconds into MM:SS or H:MM:SS display string
 */
function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const num = typeof totalSeconds === "string" ? parseInt(totalSeconds, 10) : totalSeconds;
  if (isNaN(num) || num <= 0) return "";

  const hours = Math.floor(num / 3600);
  const minutes = Math.floor((num % 3600) / 60);
  const seconds = num % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Parse duration - handles both seconds (Substack) and H:MM:SS (SermonAudio)
 */
function parseDurationToSeconds(durationVal) {
  if (!durationVal) return 0;
  const str = String(durationVal).trim();

  // If it's just a number (seconds from Substack)
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // H:MM:SS or MM:SS format
  const parts = str.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function () {
  // Configure the RSS parser with iTunes and DC namespace fields
  const parser = new Parser({
    customFields: {
      item: [
        ["itunes:duration", "duration"],
        ["itunes:author", "itunesAuthor"],
        ["itunes:subtitle", "subtitle"],
        ["itunes:image", "image", { keepArray: false }],
        ["dc:creator", "creator"],
      ],
    },
  });

  try {
    // Fetch the RSS feed with caching
    const feedXml = await EleventyFetch(SERMON_FEED_URL, {
      duration: CACHE_DURATION,
      type: "text",
    });

    // Parse the XML feed
    const feed = await parser.parseString(feedXml);

    // Process and return sermon items
    const sermons = feed.items.map((item, index) => {
      // Extract scripture from description HTML (Substack format)
      const scriptureRaw = extractScriptureFromDescription(item.contentSnippet || item.content || item.description || "");
      const normalizedScripture = normalizeScripture(scriptureRaw);
      const book = extractBook(normalizedScripture);

      // Speaker: prefer per-item creator, fall back to itunes:author or channel author
      const speaker = item.creator || item.itunesAuthor || feed.itunes?.author || "Spencer Mills OPC";

      // Duration: Substack gives seconds, SermonAudio gives H:MM:SS
      const durationSeconds = parseDurationToSeconds(item.duration);
      const durationDisplay = formatDuration(durationSeconds);

      const dateObj = new Date(item.pubDate);

      return {
        id: index,
        title: item.title || "Untitled Sermon",
        speaker: speaker,
        date: item.pubDate,
        dateFormatted: formatDate(item.pubDate),
        isoDate: item.isoDate || dateObj.toISOString(),
        year: dateObj.getFullYear(),
        scripture: scriptureRaw,
        scriptureNormalized: normalizedScripture,
        book: book,
        series: item.subtitle || "",
        duration: durationDisplay,
        durationSeconds: durationSeconds,
        audioUrl: item.enclosure?.url || "",
        link: item.link || "",
        guid: item.guid || item.link || `sermon-${index}`,
      };
    });

    // Sort by date (newest first)
    sermons.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate metadata for filtering
    const speakers = [...new Set(sermons.map((s) => s.speaker))].sort();
    const books = [...new Set(sermons.map((s) => s.book).filter(Boolean))].sort((a, b) => {
      // Sort numbered books properly (1 John before 2 John, etc.)
      const aNum = a.match(/^(\d+)/);
      const bNum = b.match(/^(\d+)/);
      const aName = a.replace(/^\d+\s*/, '');
      const bName = b.replace(/^\d+\s*/, '');

      if (aName === bName && aNum && bNum) {
        return parseInt(aNum[1]) - parseInt(bNum[1]);
      }
      return a.localeCompare(b);
    });
    const years = [
      ...new Set(sermons.map((s) => new Date(s.date).getFullYear())),
    ].sort((a, b) => b - a);

    return {
      items: sermons,
      meta: {
        total: sermons.length,
        speakers: speakers,
        books: books,
        years: years,
        feedTitle: feed.title || "Sermons",
        lastBuildDate: feed.lastBuildDate || new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("Error fetching sermon feed:", err.message);
    // Return empty data on error to prevent build failure
    return {
      items: [],
      meta: {
        total: 0,
        speakers: [],
        books: [],
        years: [],
        feedTitle: "Sermons",
        lastBuildDate: new Date().toISOString(),
        error: err.message,
      },
    };
  }
};
