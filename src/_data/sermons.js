/**
 * Sermons Data
 *
 * Fetches sermon data from a podcast RSS feed at build time.
 * The feed is cached for 1 day to avoid excessive requests.
 *
 * Configure the feed URL below for your church's podcast feed.
 */

const EleventyFetch = require("@11ty/eleventy-fetch");
const Parser = require("rss-parser");

// Configure your sermon feed URL here
// SermonAudio format: https://feed.sermonaudio.com/broadcasters/YOUR_ID
const SERMON_FEED_URL = "https://feed.sermonaudio.com/broadcasters/lfc";

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
 * Extract book name for filtering/grouping
 */
function extractBook(scripture) {
  if (!scripture) return "";
  // Match book name (including numbered books like "1 Corinthians")
  const match = scripture.match(/^(\d?\s?[A-Za-z]+)/);
  return match ? match[1].trim() : "";
}

/**
 * Parse duration string (H:MM:SS or MM:SS) to seconds
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
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

module.exports = async function () {
  // Configure the RSS parser with iTunes namespace fields
  const parser = new Parser({
    customFields: {
      item: [
        ["itunes:duration", "duration"],
        ["itunes:author", "speaker"],
        ["itunes:subtitle", "subtitle"],
        ["itunes:image", "image", { keepArray: false }],
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
      // Scripture reference is in the content field (not description)
      const scripture = item.content || item.description || "";
      const normalizedScripture = normalizeScripture(scripture);
      const book = extractBook(normalizedScripture);

      const dateObj = new Date(item.pubDate);

      return {
        id: index,
        title: item.title || "Untitled Sermon",
        speaker: item.speaker || "Unknown Speaker",
        date: item.pubDate,
        dateFormatted: formatDate(item.pubDate),
        isoDate: item.isoDate || dateObj.toISOString(),
        year: dateObj.getFullYear(),
        scripture: scripture,
        scriptureNormalized: normalizedScripture,
        book: book,
        series: item.subtitle || "",
        duration: item.duration || "",
        durationSeconds: parseDuration(item.duration),
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
