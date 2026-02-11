import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Rate limit: 10 requests per minute per user
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60; // seconds

// Available assets for reference
const AVAILABLE_ASSETS = {
  crypto: ['BTC', 'ETH', 'XRP', 'SOL', 'BNB'],
  equities: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'LMT', 'PLTR', 'XOM', 
             'JPM', 'V', 'WMT', 'JNJ', 'BA', 'DIS', 'NFLX', 'AMD', 'INTC', 'GS',
             'NEM', 'GOLD', 'FNV', 'WPM', 'AEM', 'KGC', 'PAAS', 'SLV', 'SILJ',
             'CVX', 'OXY', 'SLB', 'HAL', 'VLO', 'MPC', 'PSX',
             'FCX', 'SCCO', 'BHP', 'RIO', 'VALE',
             'CAT', 'DE', 'CMI',
             'UNH', 'PFE', 'MRK', 'ABBV', 'BMY',
             'GE', 'RTX', 'NOC', 'GD'],
  indexes: ['SPX', 'NDX', 'DJI', 'VIX', 'RUT'],
  commodities: ['Gold', 'Silver', 'Oil (WTI)', 'Natural Gas', 'Copper', 'Platinum', 'Wheat', 'Uranium'],
  fx: ['DXY', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CNY'],
  etfs: ['SPY', 'QQQ', 'GLD', 'TLT', 'XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLU',
         'GDX', 'GDXJ', 'SLV', 'USO', 'UNG', 'COPX', 'URNM', 'URA',
         'EEM', 'FXI', 'EWZ', 'EWJ', 'VWO',
         'IYT', 'XHB', 'ITB', 'ARKK', 'ARKG',
         'TAN', 'ICLN', 'LIT', 'REMX'],
  agriculture: ['WEAT', 'CORN', 'SOYB', 'DBA', 'MOO', 'ADM', 'BG', 'AGCO'],
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

// Type for cached research
type CachedAnalysis = {
  headline: string;
  headlineId: string;
  sourceName?: string;
  handle?: string;
  url?: string;
  ts?: string;
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
  createdAt: number;
};

export async function POST(request: Request) {
  try {
    // Authentication required
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting
    const rateLimitKey = `ratelimit:research:${userId}`;
    const currentCount = await kv.get<number>(rateLimitKey) || 0;
    
    if (currentCount >= RATE_LIMIT) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Try again in a minute.' 
      }, { status: 429 });
    }
    
    // Increment rate limit counter
    await kv.set(rateLimitKey, currentCount + 1, { ex: RATE_LIMIT_WINDOW });
    
    const body = await request.json();
    const { headline } = body;
    
    if (!headline || typeof headline !== 'string') {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
    }

    // 1. Check cache first
    const cacheKey = hashHeadline(headline);
    
    try {
      const cached = await kv.get(cacheKey) as CachedAnalysis | null;
      if (cached && cached.research) {
        return NextResponse.json({ 
          success: true, 
          impactScore: cached.impactScore,
          impactLevel: cached.impactLevel,
          assets: cached.assets,
          analysis: cached.research,
          cached: true,
          cachedAt: new Date(cached.createdAt).toISOString(),
        });
      }
    } catch (kvError) {
      console.log('KV lookup skipped:', kvError);
    }

    // 2. Generate on-demand if not cached
    const result = await generateComprehensiveAnalysis(headline);
    
    if (result) {
      // Try to cache the result
      try {
        await kv.set(cacheKey, {
          headline,
          headlineId: 'on-demand',
          impactScore: result.impactScore,
          impactLevel: result.impactLevel,
          assets: result.assets,
          research: result.research,
          createdAt: Date.now(),
        }, { ex: 5 * 24 * 60 * 60 });
      } catch (kvError) {
        console.log('KV cache write skipped:', kvError);
      }
      
      return NextResponse.json({ 
        success: true,
        impactScore: result.impactScore,
        impactLevel: result.impactLevel,
        assets: result.assets,
        analysis: result.research,
        cached: false,
      });
    }

    // 3. Fallback to keyword-based analysis
    const fallback = generateFallbackAnalysis(headline);
    return NextResponse.json({ 
      success: true, 
      impactScore: fallback.impactScore,
      impactLevel: fallback.impactLevel,
      assets: fallback.assets,
      analysis: fallback.research,
      cached: false,
      fallback: true,
    });

  } catch (error) {
    console.error('Research API error:', error);
    const fallback = generateFallbackAnalysis('');
    return NextResponse.json({ 
      error: 'Internal server error',
      impactScore: fallback.impactScore,
      impactLevel: fallback.impactLevel,
      assets: fallback.assets,
      analysis: fallback.research,
    }, { status: 500 });
  }
}

// Comprehensive AI analysis
async function generateComprehensiveAnalysis(headline: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: `You are an expert financial analyst providing actionable trade ideas. Analyze this headline with deep 2nd and 3rd order thinking.

NEWS HEADLINE: "${headline}"

AVAILABLE INSTRUMENTS:
- Crypto: ${AVAILABLE_ASSETS.crypto.join(', ')}
- Equities: ${AVAILABLE_ASSETS.equities.join(', ')}
- Indexes: ${AVAILABLE_ASSETS.indexes.join(', ')}
- Commodities: ${AVAILABLE_ASSETS.commodities.join(', ')}
- FX: ${AVAILABLE_ASSETS.fx.join(', ')}
- ETFs: ${AVAILABLE_ASSETS.etfs.join(', ')}
- Agriculture: ${AVAILABLE_ASSETS.agriculture.join(', ')}

YOUR TASK:
1. Identify the PRIMARY assets directly affected
2. Think deeper - what RELATED instruments benefit or suffer?
   - If Gold is bullish → Gold miners (GDX, GDXJ, NEM), streaming companies (FNV, WPM)
   - If Oil is bullish → Oil services (SLB, HAL), refiners (VLO, MPC), energy ETFs (XLE)
   - If rates rising → Banks benefit (JPM, GS, XLF), REITs hurt
   - If USD strong → Emerging markets hurt (EEM, FXI), exporters hurt
   - If geopolitical tension → Defense stocks (LMT, RTX, NOC, GD)
3. Consider 3rd order effects - broader structural impacts

Provide analysis in this exact JSON format:
{
  "impactScore": <number 0-100>,
  "impactLevel": "High|Medium|Low",
  "assets": [
    {"asset": "SYMBOL", "assetClass": "Category", "direction": "Bullish|Bearish|Neutral", "rationale": "Brief reason"}
  ],
  "research": {
    "summary": "2-3 sentence summary explaining the market impact and key trade thesis",
    "firstOrder": [
      {"asset": "SYMBOL", "direction": "Bullish|Bearish", "rationale": "Detailed explanation of WHY this asset is affected (2-3 sentences)"}
    ],
    "secondOrder": [
      {"asset": "SYMBOL (e.g. GDX, FNV, XLE)", "direction": "Bullish|Bearish", "rationale": "How this RELATED instrument benefits/suffers from the first-order move (mention the connection)"}
    ],
    "thirdOrder": [
      {"asset": "SYMBOL", "direction": "Bullish|Bearish", "rationale": "Broader macro/structural play that emerges from this theme"}
    ],
    "contrarian": "One thoughtful contrarian viewpoint or risk to the thesis",
    "confidence": "High|Medium|Low"
  }
}

IMPORTANT:
- firstOrder: The DIRECT, obvious impacts (commodities, indexes, FX)
- secondOrder: RELATED plays - miners, ETFs, specific stocks that benefit from firstOrder moves
- thirdOrder: STRUCTURAL plays - macro themes, sector rotations, longer-term implications
- Be SPECIFIC with rationales - explain the connection clearly
- Use actual tradeable instruments (ETFs, stocks) not just concepts

IMPACT SCORING:
- 90-100 (High): Major geopolitical, Fed decisions, sanctions/tariffs, war
- 70-89 (High): Policy changes, earnings surprises, major economic data
- 50-69 (Medium): Notable business news, regional conflicts
- 30-49 (Medium): Routine updates
- 0-29 (Low): Human interest, local news`
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
    console.error('Failed to generate research:', error);
    return null;
  }
}

// Fallback analysis
function generateFallbackAnalysis(headline: string) {
  const h = headline.toLowerCase();
  
  let impactScore = 30;
  let impactLevel: 'High' | 'Medium' | 'Low' = 'Low';
  
  // Simple keyword scoring
  if (h.includes('war') || h.includes('sanction') || h.includes('tariff') || h.includes('fed')) {
    impactScore = 75;
    impactLevel = 'High';
  } else if (h.includes('oil') || h.includes('earnings') || h.includes('inflation')) {
    impactScore = 55;
    impactLevel = 'Medium';
  }

  const assets: Array<{asset: string; assetClass: string; direction: string; rationale: string}> = [];
  const research = {
    summary: "Analysis based on keyword matching (AI unavailable)",
    firstOrder: [] as Array<{asset: string; direction: string; rationale: string}>,
    secondOrder: [] as Array<{asset: string; direction: string; rationale: string}>,
    thirdOrder: [] as Array<{asset: string; direction: string; rationale: string}>,
    contrarian: "Consider that initial market reactions often overshoot - look for mean reversion opportunities",
    confidence: "Low" as const,
  };

  if (h.includes('gold')) {
    assets.push({ asset: 'Gold', assetClass: 'Commodities', direction: 'Bullish', rationale: 'Direct gold exposure' });
    research.firstOrder.push({ asset: 'Gold', direction: 'Bullish', rationale: 'Direct precious metals impact from headline news' });
    research.secondOrder.push({ asset: 'GDX', direction: 'Bullish', rationale: 'Gold miners ETF benefits from rising gold prices with leverage' });
    research.secondOrder.push({ asset: 'FNV', direction: 'Bullish', rationale: 'Franco-Nevada is a gold streaming company that benefits without mining operational risk' });
    research.thirdOrder.push({ asset: 'DXY', direction: 'Bearish', rationale: 'Gold strength often correlates with dollar weakness' });
  }

  if (h.includes('oil') || h.includes('opec') || h.includes('crude')) {
    assets.push({ asset: 'Oil (WTI)', assetClass: 'Commodities', direction: 'Bullish', rationale: 'Direct energy impact' });
    research.firstOrder.push({ asset: 'Oil (WTI)', direction: 'Bullish', rationale: 'Direct energy sector impact from supply/demand dynamics' });
    research.secondOrder.push({ asset: 'XLE', direction: 'Bullish', rationale: 'Energy sector ETF captures broad oil & gas equity exposure' });
    research.secondOrder.push({ asset: 'SLB', direction: 'Bullish', rationale: 'Schlumberger benefits from increased drilling activity when oil prices rise' });
    research.thirdOrder.push({ asset: 'XLI', direction: 'Bearish', rationale: 'Higher energy costs pressure industrial margins' });
  }
  
  if (h.includes('fed') || h.includes('rate') || h.includes('inflation')) {
    assets.push({ asset: 'TLT', assetClass: 'ETFs', direction: 'Bearish', rationale: 'Rate sensitivity' });
    research.firstOrder.push({ asset: 'TLT', direction: 'Bearish', rationale: 'Long-term treasury ETF moves inversely to interest rate expectations' });
    research.secondOrder.push({ asset: 'XLF', direction: 'Bullish', rationale: 'Financial sector benefits from wider net interest margins in rising rate environment' });
    research.secondOrder.push({ asset: 'Gold', direction: 'Bullish', rationale: 'Inflation concerns drive safe haven and real asset demand' });
    research.thirdOrder.push({ asset: 'XLU', direction: 'Bearish', rationale: 'Utilities sector struggles as bond yields make their dividends less attractive' });
  }

  if (h.includes('china') || h.includes('tariff') || h.includes('trade war')) {
    assets.push({ asset: 'FXI', assetClass: 'ETFs', direction: 'Bearish', rationale: 'China exposure' });
    research.firstOrder.push({ asset: 'FXI', direction: 'Bearish', rationale: 'China large-cap ETF directly impacted by trade tensions' });
    research.secondOrder.push({ asset: 'AAPL', direction: 'Bearish', rationale: 'Apple has significant China manufacturing and sales exposure' });
    research.thirdOrder.push({ asset: 'VIX', direction: 'Bullish', rationale: 'Trade uncertainty drives volatility expectations higher' });
  }

  if (assets.length === 0) {
    assets.push({ asset: 'SPY', assetClass: 'ETFs', direction: 'Neutral', rationale: 'Broad market' });
    research.firstOrder.push({ asset: 'SPY', direction: 'Neutral', rationale: 'Limited direct market impact identified' });
  }

  return { impactScore, impactLevel, assets, research };
}
