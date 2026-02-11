import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Available assets for reference
const AVAILABLE_ASSETS = {
  crypto: ['BTC', 'ETH', 'XRP', 'SOL', 'BNB'],
  equities: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'LMT', 'PLTR', 'XOM', 
             'JPM', 'V', 'WMT', 'JNJ', 'BA', 'DIS', 'NFLX', 'AMD', 'INTC', 'GS'],
  indexes: ['SPX', 'NDX', 'DJI', 'VIX', 'RUT'],
  energy: ['Oil (WTI)', 'Natural Gas', 'Uranium', 'Coal'],
  metals: ['Gold', 'Silver', 'Copper', 'Platinum'],
  fx: ['DXY', 'EUR/USD', 'GBP/USD', 'USD/JPY'],
  etfs: ['SPY', 'QQQ', 'GLD', 'TLT', 'URA'],
};

// Generate a hash for a headline to use as cache key
function hashHeadline(text: string): string {
  let hash = 0;
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `research:${Math.abs(hash).toString(16)}`;
}

// Extract key terms from headline for deduplication
function extractKeyTerms(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'says', 'said', 'new', 'after', 'before', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'any', 'about', 'into', 'through', 'during', 'above', 'below', 'between', 'because', 'until', 'while', 'from', 'up', 'down', 'out', 'off', 'its', 'as']);
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

// Check if two headlines are about the same story
function areSimilarHeadlines(headline1: string, headline2: string): boolean {
  const terms1 = extractKeyTerms(headline1);
  const terms2 = extractKeyTerms(headline2);
  
  if (terms1.length === 0 || terms2.length === 0) return false;
  
  const terms1Set = new Set(terms1);
  const terms2Set = new Set(terms2);
  
  // Count overlapping terms
  let overlap = 0;
  terms1.forEach(term => {
    if (terms2Set.has(term)) overlap++;
  });
  
  // Calculate Jaccard similarity
  const allTerms = new Set([...terms1, ...terms2]);
  const union = allTerms.size;
  const similarity = overlap / union;
  
  // If more than 60% similar, consider them the same story (stricter deduplication)
  return similarity > 0.6;
}

// Deduplicate headlines, keeping the longest/most detailed one
function deduplicateHeadlines(items: Array<{id: string; text: string; sourceName: string; handle: string; ts: string; url: string; country: string | null}>): typeof items {
  const groups: Array<typeof items> = [];
  
  for (const item of items) {
    let foundGroup = false;
    
    for (const group of groups) {
      if (areSimilarHeadlines(item.text, group[0].text)) {
        group.push(item);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([item]);
    }
  }
  
  // From each group, keep the longest headline (usually most detailed)
  return groups.map(group => {
    return group.reduce((best, current) => 
      current.text.length > best.text.length ? current : best
    );
  });
}

// Comprehensive AI analysis - impact score, asset tags, and full research
async function generateComprehensiveAnalysis(headline: string): Promise<{
  impactScore: number;
  impactLevel: 'High' | 'Medium' | 'Low';
  assets: Array<{asset: string; assetClass: string; direction: string; rationale: string}>;
  research: {
    summary: string;
    firstOrder: Array<{asset: string; direction: string; rationale: string}>;
    secondOrder: Array<{asset: string; direction: string; rationale: string}>;
    thirdOrder: Array<{asset: string; direction: string; rationale: string}>;
    contrarian: string;
    confidence: string;
  };
} | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `You are an expert financial analyst. Analyze this news headline comprehensively.

NEWS HEADLINE: "${headline}"

AVAILABLE ASSETS:
- Crypto: ${AVAILABLE_ASSETS.crypto.join(', ')}
- Equities: ${AVAILABLE_ASSETS.equities.join(', ')}
- Indexes: ${AVAILABLE_ASSETS.indexes.join(', ')}
- Energy: ${AVAILABLE_ASSETS.energy.join(', ')}
- Metals: ${AVAILABLE_ASSETS.metals.join(', ')}
- FX: ${AVAILABLE_ASSETS.fx.join(', ')}
- ETFs: ${AVAILABLE_ASSETS.etfs.join(', ')}

Provide your analysis in this exact JSON format:
{
  "impactScore": <number 0-100>,
  "impactLevel": "High|Medium|Low",
  "impactReasoning": "Brief explanation of why this impact level",
  "assets": [
    {"asset": "SYMBOL", "assetClass": "Crypto|Equities|Indexes|Energy|Metals|FX", "direction": "Bullish|Bearish|Neutral", "rationale": "Brief reason"}
  ],
  "research": {
    "summary": "1-2 sentence summary of market impact",
    "firstOrder": [
      {"asset": "SYMBOL", "direction": "Bullish|Bearish|Neutral", "rationale": "Direct impact explanation"}
    ],
    "secondOrder": [
      {"asset": "SYMBOL", "direction": "Bullish|Bearish|Neutral", "rationale": "Indirect/supply chain impact"}
    ],
    "thirdOrder": [
      {"asset": "SYMBOL", "direction": "Bullish|Bearish|Neutral", "rationale": "Macro/structural impact"}
    ],
    "contrarian": "One contrarian viewpoint",
    "confidence": "High|Medium|Low"
  }
}

IMPACT SCORING GUIDE (BE STRICT - only truly significant news should score above 70):
- 90-100 (High): Nuclear threats, declarations of war, major country defaults, financial system collapse, pandemic declarations, market crashes >5%, major geopolitical events, Fed rate decisions, major sanctions/tariffs
- 75-89 (Medium): Major leader deaths/changes, significant policy changes affecting multiple countries, notable business news with clear market impact, regional conflicts escalation, regulatory changes, major corporate earnings surprises
- 60-74 (Low): Significant economic data misses, sector-specific news, moderate policy changes
- Below 60: Filter out - routine news, minor updates, local stories, opinion pieces, general commentary

BE CONSERVATIVE with high scores. Most news is Low impact or below.

Examples:
- "Russia threatens nuclear response to NATO" → 98 (High)
- "Trump imposes 25% tariffs on all European imports" → 92 (High)
- "Fed raises rates by 50 basis points" → 88 (Medium)
- "Apple reports earnings beat expectations by 10%" → 78 (Medium)
- "Oil prices rise 2% on supply concerns" → 65 (Low)
- "Analyst upgrades Tesla stock" → 45 (Filter out)

Be specific with asset symbols. Provide 3-5 affected assets total.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        impactScore: parsed.impactScore || 50,
        impactLevel: parsed.impactLevel || 'Medium',
        assets: parsed.assets || [],
        research: parsed.research || {
          summary: '',
          firstOrder: [],
          secondOrder: [],
          thirdOrder: [],
          contrarian: '',
          confidence: 'Low'
        }
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to generate analysis:', error);
    return null;
  }
}

// Clean up old entries (older than 5 days)
async function cleanupOldEntries() {
  try {
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
    const keys = await kv.keys('research:*');
    
    let deleted = 0;
    for (const key of keys) {
      const entry = await kv.get(key) as { createdAt?: number } | null;
      if (entry && entry.createdAt && entry.createdAt < fiveDaysAgo) {
        await kv.del(key);
        deleted++;
      }
    }
    
    return deleted;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    totalHeadlines: 0,
    afterDedup: 0,
    processed: 0,
    generated: 0,
    cached: 0,
    errors: 0,
    deleted: 0,
    highImpact: 0,
    mediumImpact: 0,
    lowImpact: 0,
  };

  try {
    // 1. Fetch headlines from KV (populated by analyze-news cron)
    const cachedData = await kv.get('analyzed-news:data') as { items: Array<{ id: string; text: string; sourceName: string; handle: string; ts: string; url: string; country: string | null }> } | null;
    
    if (!cachedData || !cachedData.items || cachedData.items.length === 0) {
      return Response.json({
        success: true,
        message: 'No analyzed news data available yet. Waiting for analyze-news cron.',
        results
      });
    }
    
    const allHeadlines = cachedData.items;
    results.totalHeadlines = allHeadlines.length;
    
    // 2. Deduplicate similar headlines
    const uniqueHeadlines = deduplicateHeadlines(allHeadlines);
    results.afterDedup = uniqueHeadlines.length;
    
    // 3. Process each unique headline
    for (const item of uniqueHeadlines) {
      results.processed++;
      const cacheKey = hashHeadline(item.text);
      
      // Check if already cached
      const existing = await kv.get(cacheKey);
      if (existing) {
        results.cached++;
        continue;
      }
      
      // Generate comprehensive analysis
      const analysis = await generateComprehensiveAnalysis(item.text);
      
      if (analysis) {
        // Track impact levels
        if (analysis.impactLevel === 'High') results.highImpact++;
        else if (analysis.impactLevel === 'Medium') results.mediumImpact++;
        else results.lowImpact++;
        
        // Store in cache with timestamp
        await kv.set(cacheKey, {
          headline: item.text,
          headlineId: item.id,
          sourceName: item.sourceName,
          handle: item.handle,
          url: item.url,
          ts: item.ts,
          impactScore: analysis.impactScore,
          impactLevel: analysis.impactLevel,
          assets: analysis.assets,
          research: analysis.research,
          createdAt: Date.now(),
        }, { ex: 5 * 24 * 60 * 60 }); // Expire after 5 days
        
        results.generated++;
      } else {
        results.errors++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    // 4. Cleanup old entries
    results.deleted = await cleanupOldEntries();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      results,
    }, { status: 500 });
  }
}
