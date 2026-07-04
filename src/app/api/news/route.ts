import { NextResponse } from "next/server";

type Source = {
  name: string;
  category: string;
  language: "Tamil" | "English" | "Sinhala";
  url: string;
  kind: "rss" | "page";
  host?: string;
};

type Story = {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  language: "Tamil" | "English" | "Sinhala";
  publishedAt: string;
  url: string;
  image: string;
  tone: string;
};

const sources: Source[] = [
  { name: "TamilWin", category: "Sri Lanka", language: "Tamil", kind: "page", url: "https://tamilwin.com/latest", host: "https://tamilwin.com" },
  { name: "Lankasri", category: "Sri Lanka", language: "Tamil", kind: "page", url: "https://news.lankasri.com/srilanka", host: "https://news.lankasri.com" },
  { name: "TamilMirror", category: "Sri Lanka", language: "Tamil", kind: "page", url: "https://www.tamilmirror.lk", host: "https://www.tamilmirror.lk" },
  { name: "News 1st Tamil", category: "Sri Lanka", language: "Tamil", kind: "page", url: "https://tamil.newsfirst.lk/latest", host: "https://tamil.newsfirst.lk" },
  { name: "BBC News", category: "World", language: "English", kind: "rss", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { name: "BBC World", category: "World", language: "English", kind: "rss", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC Business", category: "Business", language: "English", kind: "rss", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "BBC Technology", category: "Technology", language: "English", kind: "rss", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { name: "BBC Tamil", category: "Tamil", language: "Tamil", kind: "rss", url: "https://feeds.bbci.co.uk/tamil/rss.xml" },
  { name: "Dinamani", category: "Tamil World", language: "Tamil", kind: "rss", url: "https://www.dinamani.com/stories.rss" },
  { name: "Al Jazeera", category: "World", language: "English", kind: "rss", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "CNN", category: "World", language: "English", kind: "rss", url: "http://rss.cnn.com/rss/edition.rss" },
  { name: "AP News", category: "World", language: "English", kind: "rss", url: "https://apnews.com/hub/ap-top-news?output=rss" },
  { name: "The Guardian", category: "World", language: "English", kind: "rss", url: "https://www.theguardian.com/world/rss" },
  { name: "Guardian Business", category: "Business", language: "English", kind: "rss", url: "https://www.theguardian.com/business/rss" },
  { name: "Guardian Technology", category: "Technology", language: "English", kind: "rss", url: "https://www.theguardian.com/technology/rss" },
  { name: "Indian Express", category: "India", language: "English", kind: "rss", url: "https://indianexpress.com/section/india/feed/" },
  { name: "The Hindu", category: "India", language: "English", kind: "rss", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { name: "News First", category: "Sri Lanka", language: "English", kind: "rss", url: "https://www.newsfirst.lk/feed/" },
  { name: "Tamil Guardian", category: "Politics", language: "English", kind: "rss", url: "https://www.tamilguardian.com/rss.xml" },
  { name: "Ada Derana", category: "General", language: "English", kind: "rss", url: "https://www.adaderana.lk/rss.php" },
  { name: "Ada Derana Sinhala", category: "Sri Lanka", language: "Sinhala", kind: "rss", url: "https://sinhala.adaderana.lk/rsshotnews.php" },
  { name: "News 1st Sinhala", category: "Sri Lanka", language: "Sinhala", kind: "page", url: "https://sinhala.newsfirst.lk", host: "https://sinhala.newsfirst.lk" },
  { name: "NewsWire", category: "General", language: "English", kind: "rss", url: "https://www.newswire.lk/feed/" },
  { name: "EconomyNext", category: "Business", language: "English", kind: "rss", url: "https://economynext.com/feed/" },
  { name: "Daily Mirror", category: "General", language: "English", kind: "rss", url: "https://www.dailymirror.lk/rss/top-story" },
  { name: "Daily Mirror Latest", category: "Sri Lanka", language: "English", kind: "rss", url: "https://www.dailymirror.lk/index.php?format=feed&type=rss" }
];

const feedWindow = 8 * 60 * 60 * 1000;
const popularWindow = 60 * 60 * 1000;
const oneHour = 60 * 60 * 1000;

function clean(value: string) {
  return decodeEntities(value)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function textBetween(input: string, tag: string) {
  const match = input.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return clean(match?.[1] ?? "");
}

function cleanTitle(value: string) {
  return clean(value)
    .replace(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}\s*(?:\|\s*)?(?:\d{1,2}:\d{2}\s*(?:AM|PM)?\s*)?/i, "")
    .replace(/^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*(?:\|\s*)?(?:\d{1,2}:\d{2}\s*(?:AM|PM)?\s*)?/i, "")
    .replace(/^\d{1,2}:\d{2}\s*(?:AM|PM)?\s*/i, "")
    .replace(/^\d{1,2}-\d{1,2}-\d{4}\s*\|\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*/i, "")
    .replace(/^\|\s*/, "")
    .replace(/\b\d{1,2}\s+(?:minute|minutes|min|hour|hours|hr)s?\s+ago\b.*$/i, "")
    .replace(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\b.*$/i, "")
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b.*$/i, "")
    .replace(/\s+-\s+Google News$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function imageFrom(item: string) {
  const thumbnail = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1];
  const media = item.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1];
  const enclosure = item.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1];
  const dataSrc = item.match(/data-src=["']([^"']+)["']/i)?.[1];
  const inline = item.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const encoded = decodeEntities(item).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  return thumbnail || media || enclosure || dataSrc || inline || encoded || "";
}

function parseRss(xml: string, source: Source): Story[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, 24).map((item, index) => {
    const title = cleanTitle(textBetween(item, "title"));
    const summary = textBetween(item, "description");
    const rawPublishedAt = textBetween(item, "pubDate");
    return {
      id: stableId(source.name, index, title),
      title,
      summary,
      source: source.name,
      category: source.category,
      language: source.language,
      publishedAt: normalizeRssPublishedAt(rawPublishedAt, source),
      url: textBetween(item, "link"),
      image: imageFrom(item),
      tone: pickTone(`${title} ${summary}`)
    };
  });
}

function normalizeRssPublishedAt(value: string, source: Source) {
  if (source.name === "Ada Derana Sinhala") {
    const localSriLankaTime = value.replace(/\s\+0000$/i, " +0530");
    const parsed = new Date(localSriLankaTime);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return value;
}

async function fetchText(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "GOjejeNewsBot/1.0 (+https://gojeje.local)"
      }
    });
    if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSectionPage(html: string, source: Source): Story[] {
  const matches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const stories: Story[] = [];
  const seen = new Set<string>();

  for (const [full, href, body] of matches) {
    const url = absoluteUrl(href, source);
    if (!url || seen.has(url) || !isArticleUrl(url, source)) continue;

    const title = cleanTitle(body).replace(/^NEW\s+/i, "");
    const image = imageFrom(full);
    const imageAlt = clean(full.match(/alt=["']([^"']+)["']/i)?.[1] ?? "");
    const usableTitle = title.length > 18 ? title : cleanTitle(imageAlt);
    if (!usableTitle || usableTitle.length < 18) continue;

    const around = html.slice(Math.max(0, html.indexOf(full) - 700), html.indexOf(full) + full.length + 900);
    const timeText = timeTextFromSnippet(around);
    const summary = clean(around.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const publishedAt = dateFromTimeText(timeText) || dateFromDatedText(`${body} ${around}`) || dateFromArticleUrl(url);
    if (!publishedAt) continue;

    seen.add(url);
    stories.push({
      id: stableId(source.name, stories.length, usableTitle),
      title: usableTitle,
      summary: summary && !summary.includes("மணி நேரம்") ? summary : `${source.name} வெளியிட்ட சமீபத்திய இலங்கை செய்தி.`,
      source: source.name,
      category: source.category,
      language: source.language,
      publishedAt,
      url,
      image,
      tone: pickTone(`${usableTitle} ${summary}`)
    });

    if (stories.length >= 30) break;
  }

  return stories;
}

function articleLinksFromSection(html: string, source: Source) {
  const links: string[] = [];
  const seen = new Set<string>();
  const matches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)];

  for (const [, href] of matches) {
    const url = absoluteUrl(href, source).split("#")[0];
    if (!url || seen.has(url) || !isArticleUrl(url, source)) continue;
    seen.add(url);
    links.push(url);
    if (links.length >= 8) break;
  }

  return links;
}

async function fetchTamilWinArticle(url: string, source: Source, index: number): Promise<Story | null> {
  const html = await fetchText(url, 2500);
  const title = cleanTitle(
    metaContent(html, "property", "og:title") ||
    metaContent(html, "name", "twitter:title") ||
    clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
  );
  if (!title || title.length < 18) return null;

  const summary =
    metaContent(html, "property", "og:description") ||
    metaContent(html, "name", "description") ||
    clean(html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
  const image =
    metaContent(html, "property", "og:image") ||
    metaContent(html, "name", "twitter:image") ||
    imageFrom(html);
  const publishedAt = publishedAtFromArticlePage(html, url);
  if (!publishedAt || !isWithinWindow(publishedAt, oneHour)) return null;

  return {
    id: stableId(source.name, index, title),
    title,
    summary: summary || `${source.name} வெளியிட்ட சமீபத்திய இலங்கை செய்தி.`,
    source: source.name,
    category: source.category,
    language: source.language,
    publishedAt,
    url,
    image,
    tone: pickTone(`${title} ${summary}`)
  };
}

async function fetchTamilWinLatest(source: Source) {
  const html = await fetchText(source.url, 5000);
  const links = articleLinksFromSection(html, source);
  const settled = await Promise.allSettled(links.map((url, index) => fetchTamilWinArticle(url, source, index)));
  const seen = new Set<string>();

  return settled
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .filter((story) => {
      const key = story.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function absoluteUrl(href: string, source: Source) {
  if (href.startsWith("http://")) return href.replace(/^http:\/\//, "https://");
  if (href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `${source.host ?? new URL(source.url).origin}${href}`;
  return "";
}

function isArticleUrl(url: string, source: Source) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const sourceHost = new URL(source.host ?? source.url).hostname.replace(/^www\./, "");
  if (!hostname.endsWith(sourceHost)) return false;

  if (source.name === "TamilWin" || source.name === "Lankasri") return /\/article\//.test(url);
  if (source.name === "TamilMirror") return /\/\d+-\d+(?:[/?#]|$)/.test(url);
  if (source.name === "Virakesari") return /\/article\//.test(url);
  if (source.name === "Ada Derana Sinhala") return /\/news\.php\?nid=\d+/.test(url);
  if (source.name.includes("News 1st")) return /\/(?:tamil|sinhala)\/\d{4}\//.test(url) || /\/\d{4}\/\d{2}\/\d{2}\//.test(url);
  if (source.name === "Dinamani") return /\/[^/?#]+\/\d+/.test(url) || /\/\d{4}\/\d{2}\/\d{2}\//.test(url);
  return /\/article\/|\/news\/|\/\d{4}\/\d{2}\/\d{2}\//.test(url);
}

function timeTextFromSnippet(snippet: string) {
  const postedAt = clean(snippet.match(/<span[^>]+class=["'][^"']*posted-at[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
  if (postedAt) return postedAt;

  const text = clean(snippet);
  return text.match(/(?:article\s+posted\s+time\s*:\s*)?(\d{1,2}:\d{2}\s*(?:AM|PM)\s*GMT)/i)?.[1] ?? "";
}

function metaContent(html: string, attr: "name" | "property", value: string) {
  const attrFirst = new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`, "i");
  return clean(attrFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? "");
}

function publishedAtFromArticlePage(html: string, url: string) {
  const metaDate =
    metaContent(html, "property", "article:published_time") ||
    metaContent(html, "name", "pubdate") ||
    metaContent(html, "name", "publishdate");
  if (metaDate && !Number.isNaN(new Date(metaDate).getTime())) return new Date(metaDate).toISOString();

  const jsonDate = decodeEntities(html).match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  if (jsonDate && !Number.isNaN(new Date(jsonDate).getTime())) return new Date(jsonDate).toISOString();

  return dateFromTimeText(timeTextFromSnippet(html)) || dateFromArticleUrl(url);
}

function dateFromTimeText(text: string) {
  const now = Date.now();
  const gmtDate = dateFromGmtClockTime(text, now);
  if (gmtDate) return gmtDate;

  const number = Number(text.match(/\d+/)?.[0] ?? 0);
  if (/நிமிடம்|minute|min|මිනිත්තු|විනාඩි/i.test(text)) return new Date(now - number * 60 * 1000).toISOString();
  if (/மணி|hour|hr|පැය/i.test(text)) return new Date(now - number * 60 * 60 * 1000).toISOString();
  if (/நாள்|day|දින/i.test(text)) return new Date(now - number * 24 * 60 * 60 * 1000).toISOString();
  return "";
}

function dateFromDatedText(text: string) {
  const numeric = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = Number(numeric[3]);
    const parsed = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const named = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i);
  if (named) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11
    };
    const day = Number(named[1]);
    const month = months[named[2].toLowerCase()];
    const year = Number(named[3]);
    const parsed = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return "";
}

function dateFromGmtClockTime(text: string, now: number) {
  const match = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT/i);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes > 59) return "";
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const current = new Date(now);
  let parsed = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), hours, minutes, 0);
  if (parsed > now + 5 * 60 * 1000) parsed -= 24 * 60 * 60 * 1000;
  return new Date(parsed).toISOString();
}

function dateFromArticleUrl(url: string) {
  const timestamp = Number(url.match(/-(\d{10})(?:[/?#]|$)/)?.[1] ?? 0);
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toISOString();
}

function isWithinWindow(value: string, windowMs: number) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  const age = Date.now() - time;
  return age >= 0 && age <= windowMs;
}

function isRecentStory(story: Story) {
  return isWithinWindow(story.publishedAt, feedWindow);
}

function isPopularWindowStory(story: Story) {
  return isWithinWindow(story.publishedAt, popularWindow);
}

function popularityScore(story: Story) {
  const sourceWeight: Record<string, number> = {
    "BBC News": 26,
    "BBC World": 24,
    "BBC Business": 20,
    "BBC Technology": 20,
    "BBC Tamil": 30,
    "News First": 24,
    "Ada Derana": 23,
    "Ada Derana Sinhala": 25,
    NewsWire: 22,
    TamilWin: 30,
    Lankasri: 30,
    TamilMirror: 28,
    "The Hindu": 14,
    "The Guardian": 18,
    "Guardian Business": 16,
    "Guardian Technology": 16,
    Dinamani: 24,
    "Al Jazeera": 18,
    EconomyNext: 17,
    "Daily Mirror": 17,
    "Daily Mirror Latest": 17
  };
  const text = `${story.title} ${story.summary} ${story.category}`.toLowerCase();
  const ageMinutes = Math.max(1, (Date.now() - new Date(story.publishedAt).getTime()) / 60000);
  const recency = Math.max(0, 120 - ageMinutes / 4);
  const topicBoost = /sri lanka|lanka|colombo|fuel|economy|court|police|arrest|weather|breaking|இலங்கை|கொழும்பு|எரிபொருள்|கைது|நீதிமன்றம்/.test(text) ? 22 : 0;
  const imageBoost = story.image ? 18 : 0;
  const alertBoost = story.tone === "alert" ? 16 : 0;

  return (sourceWeight[story.source] ?? 10) + recency + topicBoost + imageBoost + alertBoost;
}

function sourceFeedCap(source: string) {
  const caps: Record<string, number> = {
    "The Hindu": 12,
    "Al Jazeera": 12,
    NewsWire: 14,
    "BBC News": 10,
    "BBC World": 10,
    "BBC Business": 8,
    "BBC Technology": 8,
    "The Guardian": 10,
    "Guardian Business": 8,
    "Guardian Technology": 8,
    Lankasri: 18,
    TamilWin: 18,
    TamilMirror: 16,
    "BBC Tamil": 16,
    Dinamani: 18,
    "Ada Derana Sinhala": 14,
    "News 1st Sinhala": 8,
    "News 1st Tamil": 14,
    "Daily Mirror Latest": 8
  };
  return caps[source] ?? 8;
}

function balancedStories(items: Story[], limit: number) {
  const ranked = [...items].sort((a, b) => {
    const scoreDifference = popularityScore(b) - popularityScore(a);
    if (scoreDifference !== 0) return scoreDifference;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
  const counts = new Map<string, number>();
  const chosen: Story[] = [];
  const minimumTamilStories = limit >= 50
    ? Math.min(ranked.filter((story) => story.language === "Tamil").length, Math.ceil(limit * 0.4))
    : 0;

  for (const story of ranked) {
    if (chosen.length >= minimumTamilStories) break;
    if (story.language !== "Tamil") continue;
    const count = counts.get(story.source) ?? 0;
    if (count >= sourceFeedCap(story.source)) continue;
    counts.set(story.source, count + 1);
    chosen.push(story);
  }

  for (const story of ranked) {
    if (chosen.length >= limit) break;
    if (chosen.some((item) => item.id === story.id)) continue;
    const count = counts.get(story.source) ?? 0;
    if (count >= sourceFeedCap(story.source)) continue;
    counts.set(story.source, count + 1);
    chosen.push(story);
  }

  for (const story of ranked) {
    if (chosen.length >= limit) break;
    if (!chosen.some((item) => item.id === story.id)) chosen.push(story);
  }

  return chosen.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function stableId(source: string, index: number, title: string) {
  return `${source}-${index}-${title}`.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 110);
}

function pickTone(text: string) {
  const lower = text.toLowerCase();
  if (/fuel|oil|petrol|diesel|எரிபொருள்|எண்ணெய்/.test(lower)) return "fuel";
  if (/weather|rain|மழை|வானிலை/.test(lower)) return "weather";
  if (/economy|business|gold|market|பொருளாதாரம்|தங்க/.test(lower)) return "market";
  if (/police|court|arrest|கைது|நீதிமன்றம்|பொலிஸ்/.test(lower)) return "alert";
  return "city";
}

async function fetchSource(source: Source) {
  if (source.name === "TamilWin") return fetchTamilWinLatest(source);

  const text = await fetchText(source.url, 5000);
  return source.kind === "rss" ? parseRss(text, source) : parseSectionPage(text, source);
}

async function fetchSourceWithTimeout(source: Source) {
  const timeout = new Promise<Story[]>((resolve) => {
    setTimeout(() => resolve([]), source.name === "TamilWin" ? 8000 : 6000);
  });
  return Promise.race([fetchSource(source), timeout]);
}

export async function GET() {
  try {
    const settled = await Promise.allSettled(sources.map(fetchSourceWithTimeout));
    const seen = new Set<string>();

    const allStories = settled
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .filter((story) => story.title)
      .filter((story) => !Number.isNaN(new Date(story.publishedAt).getTime()))
      .filter((story) => {
        const key = `${story.url || story.title}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const stories = balancedStories(allStories.filter(isRecentStory), 100);
    const popularStories = balancedStories(allStories.filter(isPopularWindowStory), 12);

    return NextResponse.json({
      live: stories.length > 0,
      sources: sources.map(({ name, language, category, url }) => ({ name, language, category, url })),
      stories: stories.length > 0 ? stories : [],
      popularStories
    });
  } catch (error) {
    return NextResponse.json({
      live: false,
      sources: sources.map(({ name, language, category, url }) => ({ name, language, category, url })),
      stories: [],
      popularStories: [],
      error: error instanceof Error ? error.message : "News fetch failed"
    });
  }
}
