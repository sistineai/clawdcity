import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Congressional trades data sources (free)
const HOUSE_DATA_URL = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
const SENATE_DATA_URL = 'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json';

// RSS Feed sources
const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World", handle: "BBCWorld" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", name: "BBC Business", handle: "BBCBiz" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", name: "CNBC", handle: "CNBC" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", handle: "AJEnglish" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", name: "NY Times World", handle: "NYTimes" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", name: "NY Times Business", handle: "NYTBiz" },
  { url: "https://www.ft.com/rss/home", name: "Financial Times", handle: "FT" },
  { url: "https://feeds.washingtonpost.com/rss/world", name: "Washington Post", handle: "WashPost" },
  { url: "https://www.theguardian.com/world/rss", name: "The Guardian", handle: "Guardian" },
  { url: "https://feeds.feedburner.com/zerohedge/feed", name: "ZeroHedge", handle: "zerohedge" },
  { url: "https://www.marketwatch.com/rss/topstories", name: "MarketWatch", handle: "MarketWatch" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", name: "Yahoo Finance", handle: "YahooFinance" },
  { url: "https://www.investing.com/rss/news.rss", name: "Investing.com", handle: "Investingcom" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", name: "Google Business", handle: "GoogleNews" },
];

interface CongressTrade {
  transaction_date: string;
  disclosure_date: string;
  representative?: string;
  senator?: string;
  ticker: string;
  asset_description: string;
  type: string;
  amount: string;
  party: string;
  state?: string;
}

// Types
interface CachedAnalysis {
  impactScore: number;
  impactLevel: string;
  assets: Array<{
    asset: string;
    assetClass: string;
    direction: string;
    rationale: string;
  }>;
  research: {
    summary: string;
    marketImpact: string;
    relatedAssets: string[];
    outlook: string;
  } | null;
}

// Generate hash for cache key
function hashHeadline(text: string): string {
  let hash = 0;
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `headline:${Math.abs(hash).toString(16)}`;
}

// Migrate old asset classes
function migrateAssetClass(assetClass: string, asset: string): string {
  if (assetClass === 'Commodities') {
    const energyAssets = ['Oil', 'WTI', 'Brent', 'Natural Gas', 'NG', 'Uranium', 'URA', 'Coal'];
    const agricultureAssets = ['Wheat', 'Corn', 'Soybeans', 'Coffee', 'Sugar', 'Cotton', 'Cocoa', 'Cattle', 'Hogs'];
    const a = asset.toLowerCase();
    if (energyAssets.some(e => a.includes(e.toLowerCase()))) return 'Energy';
    if (agricultureAssets.some(e => a.includes(e.toLowerCase()))) return 'Agriculture';
    return 'Metals';
  }
  return assetClass;
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&#34;/g, '"').replace(/&#38;/g, '&')
    .replace(/&#x27;/g, "'").replace(/&#x22;/g, '"').replace(/&#x26;/g, '&')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

// Detect country from headline
function detectCountry(text: string): string | null {
  const t = text.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/\b(ukraine|kyiv|kiev|zelensky)\b/i, "Ukraine"],
    [/\b(russia|moscow|kremlin|putin)\b/i, "Russia"],
    [/\b(israel|jerusalem|idf|netanyahu|gaza|hamas)\b/i, "Israel"],
    [/\b(iran|tehran)\b/i, "Iran"],
    [/\b(china|beijing|taiwan|xi jinping)\b/i, "China"],
    [/\b(us|u\.s\.|united states|washington|biden|trump|white house)\b/i, "United States of America"],
    [/\b(uk|united kingdom|london|british)\b/i, "United Kingdom"],
    [/\b(germany|berlin)\b/i, "Germany"],
    [/\b(france|paris|macron)\b/i, "France"],
  ];
  for (const [re, name] of patterns) {
    if (re.test(t)) return name;
  }
  return null;
}

// Parse RSS XML
function parseRSS(xml: string, feedName: string, feedHandle: string) {
  const items: Array<{
    id: string;
    sourceName: string;
    handle: string;
    ts: string;
    text: string;
    url: string;
    country: string | null;
  }> = [];

  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
  const linkRegex = /<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i;
  const pubDateRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = titleRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const pubDateMatch = pubDateRegex.exec(itemXml);
    
    if (titleMatch) {
      let title = decodeHtmlEntities(titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''));
      const link = linkMatch ? linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
      
      let ts: string;
      try { ts = new Date(pubDate).toISOString(); } catch { ts = new Date().toISOString(); }
      
      const id = `${feedHandle}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      
      items.push({
        id,
        sourceName: feedName,
        handle: feedHandle,
        ts,
        text: title,
        url: link,
        country: detectCountry(title),
      });
    }
  }
  return items;
}

// Fetch all RSS feeds
async function fetchAllNews() {
  const allItems: Array<{
    id: string;
    sourceName: string;
    handle: string;
    ts: string;
    text: string;
    url: string;
    country: string | null;
  }> = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' },
          next: { revalidate: 0 },
        });
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRSS(xml, feed.name, feed.handle);
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Sort by recency and dedupe
  allItems.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  
  // Normalize common entities/phrases for better matching
  function normalizeText(text: string): string {
    return text.toLowerCase()
      // Normalize Fed variations
      .replace(/federal reserve/g, 'fed')
      .replace(/fed chair/g, 'fed')
      .replace(/jerome powell/g, 'powell fed')
      .replace(/fomc/g, 'fed')
      // Normalize rate variations
      .replace(/interest rate/g, 'rate')
      .replace(/rates steady/g, 'rate hold')
      .replace(/rates unchanged/g, 'rate hold')
      .replace(/holds rate/g, 'rate hold')
      .replace(/keeps rate/g, 'rate hold')
      .replace(/rate cut/g, 'rate cut')
      .replace(/rate hike/g, 'rate hike')
      .replace(/rate increase/g, 'rate hike')
      // Normalize Trump variations
      .replace(/donald trump/g, 'trump')
      .replace(/president trump/g, 'trump')
      .replace(/trump administration/g, 'trump')
      // Normalize tariff variations
      .replace(/tariffs/g, 'tariff')
      .replace(/import duties/g, 'tariff')
      .replace(/trade war/g, 'tariff')
      // Normalize China variations
      .replace(/chinese/g, 'china')
      .replace(/beijing/g, 'china')
      // Other normalizations
      .replace(/united states/g, 'us')
      .replace(/u\.s\./g, 'us')
      .replace(/stock market/g, 'stocks')
      .replace(/oil price/g, 'oil')
      .replace(/crude oil/g, 'oil')
      .replace(/gold price/g, 'gold')
      .replace(/european union/g, 'eu')
      .replace(/european central bank/g, 'ecb')
      .replace(/bank of england/g, 'boe')
      .replace(/bank of japan/g, 'boj');
  }
  
  // Extract key terms for similarity comparison
  function extractKeyTerms(text: string): Set<string> {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'that', 'this', 'it', 'as', 'its', 'says', 'said', 'new', 'after', 'over', 'into', 'about', 'from', 'up', 'out', 'more', 'also', 'now', 'how', 'why', 'what', 'who', 'when', 'where', 'which', 'report', 'reports', 'says', 'according', 'sources', 'source', 'amid', 'despite', 'latest', 'breaking', 'update', 'live', 'just', 'today', 'yesterday', 'week', 'month', 'year']);
    
    const normalized = normalizeText(text);
    
    return new Set(
      normalized
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
    );
  }
  
  // Extract key entities (proper nouns, numbers, specific terms)
  function extractEntities(text: string): Set<string> {
    const entities = new Set<string>();
    const normalized = normalizeText(text);
    
    // Key financial/political terms that are strong indicators of same story
    const keyTerms = ['fed', 'rate', 'trump', 'tariff', 'china', 'russia', 'ukraine', 'iran', 'israel', 
                      'oil', 'gold', 'bitcoin', 'btc', 'inflation', 'recession', 'gdp', 'jobs', 
                      'earnings', 'apple', 'microsoft', 'nvidia', 'tesla', 'amazon', 'google', 'meta',
                      'powell', 'yellen', 'biden', 'putin', 'xi', 'ecb', 'boe', 'boj'];
    
    const words = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    words.forEach(word => {
      if (keyTerms.includes(word)) {
        entities.add(word);
      }
    });
    
    // Extract numbers (percentages, rates, etc.)
    const numbers = text.match(/\d+\.?\d*%?/g) || [];
    numbers.forEach(num => entities.add(num));
    
    return entities;
  }
  
  // Check if two headlines are about the same story
  function areSimilar(text1: string, text2: string): boolean {
    const terms1 = extractKeyTerms(text1);
    const terms2 = extractKeyTerms(text2);
    const entities1 = extractEntities(text1);
    const entities2 = extractEntities(text2);
    
    if (terms1.size < 3 || terms2.size < 3) return false;
    
    // If key entities match strongly, it's likely the same story
    if (entities1.size >= 2 && entities2.size >= 2) {
      let entityOverlap = 0;
      entities1.forEach(e => {
        if (entities2.has(e)) entityOverlap++;
      });
      const entityRatio = entityOverlap / Math.min(entities1.size, entities2.size);
      if (entityRatio >= 0.7) return true;
    }
    
    // Count overlapping terms
    let overlap = 0;
    terms1.forEach(term => {
      if (terms2.has(term)) overlap++;
    });
    
    // Consider similar if >50% of smaller set overlaps (lowered from 60%)
    const minSize = Math.min(terms1.size, terms2.size);
    return overlap / minSize > 0.5;
  }
  
  const deduped: typeof allItems = [];
  for (const item of allItems) {
    // Check if similar to any already added headline
    const isDuplicate = deduped.some(existing => areSimilar(item.text, existing.text));
    if (!isDuplicate) {
      deduped.push(item);
    }
  }

  return deduped.slice(0, 500);
}

// Fetch congressional trades and convert to headline format
async function fetchCongressionalTrades(): Promise<Array<{
  id: string;
  text: string;
  ts: string;
  sourceName: string;
  handle: string;
  url: string;
  country: string;
  isCongressTrade: true;
  tradeData: {
    politician: string;
    chamber: 'House' | 'Senate';
    party: string;
    ticker: string;
    type: 'Buy' | 'Sell';
    amount: string;
  };
}>> {
  const results: Array<{
    id: string;
    text: string;
    ts: string;
    sourceName: string;
    handle: string;
    url: string;
    country: string;
    isCongressTrade: true;
    tradeData: {
      politician: string;
      chamber: 'House' | 'Senate';
      party: string;
      ticker: string;
      type: 'Buy' | 'Sell';
      amount: string;
    };
  }> = [];

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  try {
    // Fetch House trades
    const houseRes = await fetch(HOUSE_DATA_URL, { next: { revalidate: 3600 } });
    if (houseRes.ok) {
      const houseData: CongressTrade[] = await houseRes.json();
      for (const trade of houseData) {
        if (!trade.ticker || trade.ticker === '--' || trade.ticker === 'N/A') continue;
        const tradeDate = new Date(trade.transaction_date);
        if (tradeDate < cutoff) continue;
        
        const tradeType = trade.type.toLowerCase().includes('purchase') ? 'Buy' : 'Sell';
        const ticker = trade.ticker.toUpperCase();
        
        results.push({
          id: `congress-house-${trade.representative}-${ticker}-${trade.transaction_date}`,
          text: `Rep. ${trade.representative} (${trade.party || '?'}) ${tradeType === 'Buy' ? 'bought' : 'sold'} ${ticker} — ${trade.amount}`,
          ts: tradeDate.toISOString(),
          sourceName: 'Congress',
          handle: 'Congress',
          url: 'https://housestockwatcher.com',
          country: 'United States',
          isCongressTrade: true,
          tradeData: {
            politician: trade.representative || 'Unknown',
            chamber: 'House',
            party: trade.party || 'Unknown',
            ticker,
            type: tradeType,
            amount: trade.amount,
          },
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch House trades:', e);
  }

  try {
    // Fetch Senate trades
    const senateRes = await fetch(SENATE_DATA_URL, { next: { revalidate: 3600 } });
    if (senateRes.ok) {
      const senateData: CongressTrade[] = await senateRes.json();
      for (const trade of senateData) {
        if (!trade.ticker || trade.ticker === '--' || trade.ticker === 'N/A') continue;
        const tradeDate = new Date(trade.transaction_date);
        if (tradeDate < cutoff) continue;
        
        const tradeType = trade.type.toLowerCase().includes('purchase') ? 'Buy' : 'Sell';
        const ticker = trade.ticker.toUpperCase();
        
        results.push({
          id: `congress-senate-${trade.senator}-${ticker}-${trade.transaction_date}`,
          text: `Sen. ${trade.senator} (${trade.party || '?'}) ${tradeType === 'Buy' ? 'bought' : 'sold'} ${ticker} — ${trade.amount}`,
          ts: tradeDate.toISOString(),
          sourceName: 'Congress',
          handle: 'Congress',
          url: 'https://senatestockwatcher.com',
          country: 'United States',
          isCongressTrade: true,
          tradeData: {
            politician: trade.senator || 'Unknown',
            chamber: 'Senate',
            party: trade.party || 'Unknown',
            ticker,
            type: tradeType,
            amount: trade.amount,
          },
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch Senate trades:', e);
  }

  // Sort by date, most recent first
  results.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  
  return results;
}

// Analyze headline with Claude API
async function analyzeWithAI(headline: string): Promise<CachedAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze this financial news headline for market impact.

HEADLINE: "${headline}"

Return a JSON object with:
- impactScore: number 30-100 (most news is 30-50, be strict)
- impactLevel: "Severe"|"High"|"Medium"|"Low"
- assets: array of {asset, assetClass, direction, rationale} (max 4)
- research: {summary, marketImpact, relatedAssets, outlook} or null for low impact

SCORING GUIDE:
- 90-100 (Severe): War, financial collapse, major disasters
- 75-89 (High): Fed decisions, major sanctions, leadership changes
- 55-74 (Medium): Earnings surprises, regional conflicts, M&A
- 30-54 (Low): Routine news, minor updates

Valid assetClass: Equities, Crypto, Energy, Metals, Agriculture, Indexes, FX, ETFs
Valid direction: Bullish, Bearish, Neutral

Return ONLY valid JSON, no other text.`
          }
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      impactScore: Math.max(30, Math.min(100, parsed.impactScore || 40)),
      impactLevel: ['Severe', 'High', 'Medium', 'Low'].includes(parsed.impactLevel) ? parsed.impactLevel : 'Low',
      assets: Array.isArray(parsed.assets) ? parsed.assets.slice(0, 4).map((a: Record<string, string>) => ({
        asset: a.asset || '',
        assetClass: migrateAssetClass(a.assetClass || 'Equities', a.asset || ''),
        direction: a.direction || 'Neutral',
        rationale: a.rationale || '',
      })) : [],
      research: parsed.research || null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // REQUIRE AUTHENTICATION
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', items: [] },
        { status: 401 }
      );
    }

    // Fetch headlines from RSS feeds
    const rawHeadlines = await fetchAllNews();

    // Process each headline - check cache first, then AI analyze if needed
    const analyzedHeadlines = await Promise.all(
      rawHeadlines.map(async (item, index) => {
        const cacheKey = hashHeadline(item.text);

        // Check cache first
        try {
          const cached = await kv.get(cacheKey) as CachedAnalysis | null;
          if (cached) {
            const migratedAssets = cached.assets.map(a => ({
              ...a,
              assetClass: migrateAssetClass(a.assetClass, a.asset)
            }));
            return {
              ...item,
              id: `${item.id}-${index}`,
              impactScore: cached.impactScore,
              impactLevel: cached.impactLevel,
              assets: migratedAssets,
              research: cached.research,
              isAnalyzed: true,
            };
          }
        } catch {
          // Cache miss, continue to AI
        }

        // Analyze with AI
        const analysis = await analyzeWithAI(item.text);

        if (analysis) {
          // Cache for 48 hours
          try {
            await kv.set(cacheKey, analysis, { ex: 172800 });
          } catch {
            // Cache failed, continue
          }

          return {
            ...item,
            id: `${item.id}-${index}`,
            impactScore: analysis.impactScore,
            impactLevel: analysis.impactLevel,
            assets: analysis.assets,
            research: analysis.research,
            isAnalyzed: true,
          };
        }

        // AI failed - return with defaults
        return {
          ...item,
          id: `${item.id}-${index}`,
          impactScore: 40,
          impactLevel: 'Low' as const,
          assets: [],
          research: null,
          isAnalyzed: false,
        };
      })
    );

    // Sort by impact score then recency
    analyzedHeadlines.sort((a, b) => {
      if (Math.abs(a.impactScore - b.impactScore) > 10) {
        return b.impactScore - a.impactScore;
      }
      return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    });

    // Fetch congressional trades and add to results
    const congressTrades = await fetchCongressionalTrades();
    const congressHeadlines = congressTrades.map((trade, index) => ({
      ...trade,
      id: `${trade.id}-${index}`,
      impactScore: 80,
      impactLevel: 'High' as const,
      assets: [{
        asset: trade.tradeData.ticker,
        assetClass: 'Equities',
        direction: trade.tradeData.type === 'Buy' ? 'Bullish' : 'Bearish',
        rationale: `${trade.tradeData.chamber} member ${trade.tradeData.type === 'Buy' ? 'purchasing' : 'selling'} shares`,
      }],
      research: {
        summary: `${trade.tradeData.politician} (${trade.tradeData.party}) disclosed a ${trade.tradeData.type.toLowerCase()} of ${trade.tradeData.ticker} worth ${trade.tradeData.amount}. Congressional trading activity can signal insider knowledge about upcoming legislation or market-moving events.`,
        marketImpact: `${trade.tradeData.type === 'Buy' ? 'Bullish' : 'Bearish'} signal for ${trade.tradeData.ticker}`,
        relatedAssets: [trade.tradeData.ticker],
        outlook: 'Monitor for additional congressional activity in this sector',
      },
      isAnalyzed: true,
    }));

    // Combine all headlines
    const allHeadlines = [...analyzedHeadlines, ...congressHeadlines];
    
    // Re-sort combined list
    allHeadlines.sort((a, b) => {
      if (Math.abs(a.impactScore - b.impactScore) > 10) {
        return b.impactScore - a.impactScore;
      }
      return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    });

    // Store in KV for other crons (auto-tweet, etc) to read
    try {
      await kv.set('analyzed-news:data', {
        items: allHeadlines,
        timestamp: new Date().toISOString(),
        count: allHeadlines.length,
      }, { ex: 600 }); // 10 min TTL
    } catch {
      // Storage failed, continue
    }

    return NextResponse.json({
      success: true,
      items: allHeadlines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in analyzed-news API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news', items: [] },
      { status: 500 }
    );
  }
}
