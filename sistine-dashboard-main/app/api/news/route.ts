import { NextResponse } from 'next/server';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// RSS Feed sources
const RSS_FEEDS = [
  // Major news outlets
  { url: "https://feeds.reuters.com/reuters/worldNews", name: "Reuters World", handle: "Reuters" },
  { url: "https://feeds.reuters.com/reuters/businessNews", name: "Reuters Business", handle: "ReutersBiz" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World", handle: "BBCWorld" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", name: "CNBC", handle: "CNBC" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", handle: "AJEnglish" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", name: "NY Times World", handle: "NYTimes" },
  { url: "https://feeds.bloomberg.com/markets/news.rss", name: "Bloomberg Markets", handle: "Bloomberg" },
  { url: "https://www.ft.com/rss/home", name: "Financial Times", handle: "FT" },
  { url: "https://feeds.washingtonpost.com/rss/world", name: "Washington Post", handle: "WashPost" },
  { url: "https://www.theguardian.com/world/rss", name: "The Guardian", handle: "Guardian" },
  // Financial/Market focused sources (replacing unreliable Twitter feeds)
  { url: "https://feeds.feedburner.com/zerohedge/feed", name: "ZeroHedge", handle: "zaboravremena" },
  { url: "https://www.marketwatch.com/rss/topstories", name: "MarketWatch", handle: "MarketWatch" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", name: "Yahoo Finance", handle: "YahooFinance" },
  { url: "https://www.investing.com/rss/news.rss", name: "Investing.com", handle: "Investingcom" },
  { url: "https://feeds.feedburner.com/TheStreet", name: "TheStreet", handle: "TheStreet" },
];

// Note: Twitter/X RSS feeds are no longer available without API access
// The feeds above provide similar real-time financial news coverage

// Country detection from text
function detectCountry(text: string): string | null {
  const t = (text || "").toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/\b(ukraine|kyiv|kiev|zelensky)\b/i, "Ukraine"],
    [/\b(russia|moscow|kremlin|putin)\b/i, "Russia"],
    [/\b(israel|jerusalem|idf|netanyahu|gaza|hamas)\b/i, "Israel"],
    [/\b(iran|tehran)\b/i, "Iran"],
    [/\b(china|beijing|taiwan|xi jinping)\b/i, "China"],
    [/\b(japan|tokyo)\b/i, "Japan"],
    [/\b(us|u\.s\.|united states|washington|biden|trump|white house|congress)\b/i, "United States of America"],
    [/\b(uk|united kingdom|london|british|britain)\b/i, "United Kingdom"],
    [/\b(germany|berlin)\b/i, "Germany"],
    [/\b(france|paris|macron)\b/i, "France"],
    [/\b(red sea|suez|yemen|houthis)\b/i, "Yemen"],
    [/\b(saudi|riyadh)\b/i, "Saudi Arabia"],
    [/\b(india|delhi|modi)\b/i, "India"],
    [/\b(australia|sydney|canberra)\b/i, "Australia"],
    [/\b(canada|ottawa|trudeau)\b/i, "Canada"],
    [/\b(brazil|brasilia|lula)\b/i, "Brazil"],
    [/\b(syria|damascus|assad)\b/i, "Syria"],
    [/\b(turkey|ankara|erdogan)\b/i, "Turkey"],
    [/\b(egypt|cairo)\b/i, "Egypt"],
    [/\b(north korea|pyongyang|kim jong)\b/i, "North Korea"],
    [/\b(south korea|seoul)\b/i, "South Korea"],
  ];
  
  for (const [re, name] of patterns) {
    if (re.test(t)) return name;
  }
  return null;
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&#38;/g, '&')
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>')
    .replace(/&#160;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x22;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/&#x3C;/g, '<')
    .replace(/&#x3E;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

// Simple hash function for stable IDs
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

// Parse RSS XML using regex (works server-side without DOM)
function parseRSS(xml: string, sourceName: string, handle: string): Array<{
  id: string;
  sourceName: string;
  handle: string;
  ts: string;
  text: string;
  url: string;
  country: string | null;
}> {
  const items: Array<{
    id: string;
    sourceName: string;
    handle: string;
    ts: string;
    text: string;
    url: string;
    country: string | null;
  }> = [];

  try {
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    
    const matches = xml.match(itemRegex) || xml.match(entryRegex) || [];
    
    for (const itemXml of matches.slice(0, 20)) {
      // Extract title
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : "";
      title = decodeHtmlEntities(title);
      
      // Extract link
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                        itemXml.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch ? (linkMatch[1] || "").trim() : "";
      
      // Extract pubDate
      const dateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                        itemXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                        itemXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
      const dateStr = dateMatch ? dateMatch[1].trim() : "";
      
      // Extract description
      const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                        itemXml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
      let desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : "";
      
      // Strip HTML from description and decode entities
      desc = desc.replace(/<[^>]*>/g, '').slice(0, 200);
      desc = decodeHtmlEntities(desc);
      
      if (!title) continue;
      
      const text = desc ? `${title} — ${desc}` : title;
      const ts = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
      const country = detectCountry(text);
      
      items.push({
        id: `rss_${hashString(title + ts + sourceName)}`,
        sourceName,
        handle,
        ts,
        text,
        url: link,
        country,
      });
    }
  } catch (e) {
    console.error(`Error parsing RSS for ${sourceName}:`, e);
  }

  return items;
}

export async function GET() {
  const allItems: Array<{
    id: string;
    sourceName: string;
    handle: string;
    ts: string;
    text: string;
    url: string;
    country: string | null;
  }> = [];

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SistineResearch/1.0)',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const xml = await response.text();
        return parseRSS(xml, feed.name, feed.handle);
      } catch (e) {
        console.error(`Failed to fetch ${feed.name}:`, e);
        return [];
      }
    })
  );

  // Collect all successful results
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Sort by timestamp (newest first)
  allItems.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Deduplicate based on similar titles
  const seen = new Set<string>();
  const deduped: typeof allItems = [];
  for (const item of allItems) {
    const key = item.text.toLowerCase().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return NextResponse.json({
    success: true,
    count: deduped.length,
    items: deduped.slice(0, 100),
    fetchedAt: new Date().toISOString(),
  });
}
