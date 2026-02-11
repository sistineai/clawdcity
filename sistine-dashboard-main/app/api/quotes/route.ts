import { NextResponse } from 'next/server';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Top 5 crypto by market cap
const CRYPTO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  xrp: 'ripple',
  sol: 'solana',
  bnb: 'binancecoin',
};

// Yahoo Finance symbols for equities (48 total)
const EQUITY_SYMBOLS: Record<string, string> = {
  // Mega Cap Tech (10)
  aapl: 'AAPL',
  msft: 'MSFT',
  nvda: 'NVDA',
  tsla: 'TSLA',
  amzn: 'AMZN',
  googl: 'GOOGL',
  meta: 'META',
  nflx: 'NFLX',
  amd: 'AMD',
  intc: 'INTC',
  // Semiconductors (5)
  avgo: 'AVGO',
  qcom: 'QCOM',
  txn: 'TXN',
  asml: 'ASML',
  mu: 'MU',
  // Finance (8)
  jpm: 'JPM',
  v: 'V',
  gs: 'GS',
  ma: 'MA',
  bac: 'BAC',
  wfc: 'WFC',
  c: 'C',
  ms: 'MS',
  // Healthcare (6)
  jnj: 'JNJ',
  unh: 'UNH',
  pfe: 'PFE',
  mrna: 'MRNA',
  abbv: 'ABBV',
  lly: 'LLY',
  // Defense & Aerospace (4)
  lmt: 'LMT',
  rtx: 'RTX',
  noc: 'NOC',
  ba: 'BA',
  // Energy (4)
  xom: 'XOM',
  cvx: 'CVX',
  cop: 'COP',
  slb: 'SLB',
  // Consumer (6)
  wmt: 'WMT',
  cost: 'COST',
  hd: 'HD',
  mcd: 'MCD',
  ko: 'KO',
  pep: 'PEP',
  // Other (5)
  dis: 'DIS',
  pltr: 'PLTR',
  crm: 'CRM',
  orcl: 'ORCL',
  ibm: 'IBM',
};

// Estimated market caps for equities (fallback if API doesn't return them)
const EQUITY_MARKET_CAPS: Record<string, number> = {
  // Mega Cap Tech
  aapl: 3.4e12,
  msft: 3.1e12,
  nvda: 3.0e12,
  tsla: 800e9,
  amzn: 2.0e12,
  googl: 2.0e12,
  meta: 1.4e12,
  nflx: 280e9,
  amd: 220e9,
  intc: 100e9,
  // Semiconductors
  avgo: 800e9,
  qcom: 180e9,
  txn: 160e9,
  asml: 350e9,
  mu: 100e9,
  // Finance
  jpm: 600e9,
  v: 550e9,
  gs: 150e9,
  ma: 420e9,
  bac: 300e9,
  wfc: 200e9,
  c: 120e9,
  ms: 150e9,
  // Healthcare
  jnj: 380e9,
  unh: 500e9,
  pfe: 150e9,
  mrna: 40e9,
  abbv: 310e9,
  lly: 750e9,
  // Defense & Aerospace
  lmt: 130e9,
  rtx: 150e9,
  noc: 70e9,
  ba: 120e9,
  // Energy
  xom: 480e9,
  cvx: 280e9,
  cop: 130e9,
  slb: 65e9,
  // Consumer
  wmt: 450e9,
  cost: 350e9,
  hd: 380e9,
  mcd: 210e9,
  ko: 260e9,
  pep: 230e9,
  // Other
  dis: 200e9,
  pltr: 150e9,
  crm: 280e9,
  orcl: 320e9,
  ibm: 170e9,
};

// Yahoo Finance symbols for indexes
const INDEX_SYMBOLS: Record<string, string> = {
  // US Indexes
  spx: '%5EGSPC',
  ndx: '%5EIXIC',
  dji: '%5EDJI',
  vix: '%5EVIX',
  rut: '%5ERUT',
  // International Indexes
  ftse: '%5EFTSE',
  dax: '%5EGDAXI',
  n225: '%5EN225',
  hsi: '%5EHSI',
  ssec: '000001.SS',
  stoxx: '%5ESTOXX50E',
};

// Yahoo Finance symbols for commodities
const COMMODITY_SYMBOLS: Record<string, string> = {
  gold: 'GC%3DF',
  silver: 'SI%3DF',
  wti: 'CL%3DF',
  brent: 'BZ%3DF',
  natgas: 'NG%3DF',
  copper: 'HG%3DF',
  platinum: 'PL%3DF',
  palladium: 'PA%3DF',
  aluminum: 'ALI%3DF',
  nickel: '%5ENICKEL',
  gasoline: 'RB%3DF',
};

// Agriculture symbols
const AGRICULTURE_SYMBOLS: Record<string, string> = {
  wheat: 'ZW%3DF',
  corn: 'ZC%3DF',
  soybeans: 'ZS%3DF',
  coffee: 'KC%3DF',
  sugar: 'SB%3DF',
  cotton: 'CT%3DF',
  cocoa: 'CC%3DF',
  cattle: 'LE%3DF',
  lumber: 'LBS%3DF',
};

// FX symbols
const FX_SYMBOLS: Record<string, string> = {
  dxy: 'DX-Y.NYB',
  eurusd: 'EURUSD%3DX',
  gbpusd: 'GBPUSD%3DX',
  usdjpy: 'JPY%3DX',
  usdcny: 'CNY%3DX',
  usdchf: 'CHF%3DX',
  audusd: 'AUDUSD%3DX',
  usdcad: 'CAD%3DX',
};

// ETF symbols
const ETF_SYMBOLS: Record<string, string> = {
  spy: 'SPY',
  qqq: 'QQQ',
  iwm: 'IWM',
  gld: 'GLD',
  tlt: 'TLT',
  uranium: 'URA',
  coal: 'KOL',
};

// Estimated market sizes for commodities (in USD)
const COMMODITY_MARKET_SIZES: Record<string, number> = {
  gold: 13.7e12,
  silver: 1.4e12,
  wti: 2.5e12,
  brent: 2.5e12,
  natgas: 400e9,
  copper: 300e9,
  platinum: 30e9,
  palladium: 15e9,
  aluminum: 150e9,
  nickel: 40e9,
  gasoline: 200e9,
};

// Agriculture market sizes
const AGRICULTURE_MARKET_SIZES: Record<string, number> = {
  wheat: 50e9,
  corn: 80e9,
  soybeans: 60e9,
  coffee: 25e9,
  sugar: 30e9,
  cotton: 40e9,
  cocoa: 12e9,
  cattle: 70e9,
  lumber: 20e9,
};

// Index total market caps (approximate)
const INDEX_MARKET_CAPS: Record<string, number> = {
  spx: 45e12,
  ndx: 25e12,
  dji: 12e12,
  vix: 0,
  rut: 3e12,
  ftse: 3e12,
  dax: 2e12,
  n225: 6e12,
  hsi: 4e12,
  ssec: 7e12,
  stoxx: 4e12,
};

// ETF AUM estimates
const ETF_MARKET_CAPS: Record<string, number> = {
  spy: 500e9,
  qqq: 250e9,
  iwm: 60e9,
  gld: 60e9,
  tlt: 50e9,
  uranium: 3e9,
  coal: 100e6,
};

type QuoteData = {
  key: string;
  price: number | null;
  mcap: number | null;
  chg24: number | null;
  sparkline: number[] | null;
};

// Fetch crypto data from CoinGecko
async function fetchCryptoQuotes(): Promise<Map<string, QuoteData>> {
  const results = new Map<string, QuoteData>();
  
  try {
    const ids = Object.values(CRYPTO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&price_change_percentage=24h&sparkline=true`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return results;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const idToKey: Record<string, string> = {};
      Object.entries(CRYPTO_IDS).forEach(([key, id]) => {
        idToKey[id] = key;
      });
      
      for (const coin of data) {
        const key = idToKey[coin.id];
        if (!key) continue;
        
        results.set(key, {
          key,
          price: coin.current_price ?? null,
          mcap: coin.market_cap ?? null,
          chg24: coin.price_change_percentage_24h ?? null,
          sparkline: coin.sparkline_in_7d?.price?.slice(-18) ?? null,
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch crypto quotes:', e);
  }
  
  return results;
}

// Fetch equity quotes using chart API (v7 quote endpoint now requires auth)
async function fetchEquityQuotes(): Promise<Map<string, QuoteData>> {
  // Use chart API directly since v7/quote now requires authentication
  return fetchYahooChartQuotes(EQUITY_SYMBOLS, EQUITY_MARKET_CAPS);
}

// Fetch quotes from Yahoo chart API (for indexes, commodities, FX, or as fallback)
async function fetchYahooChartQuotes(
  symbols: Record<string, string>,
  defaultMcaps: Record<string, number> | null
): Promise<Map<string, QuoteData>> {
  const results = new Map<string, QuoteData>();
  
  const entries = Object.entries(symbols);
  const batchSize = 5;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const promises = batch.map(async ([key, symbol]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        
        if (!response.ok) {
          console.error(`Yahoo chart API error for ${symbol}: ${response.status}`);
          return { key, data: null };
        }
        
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        
        if (!result) {
          return { key, data: null };
        }
        
        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close || [];
        
        const validCloses: number[] = [];
        for (const c of closes) {
          if (c !== null && c !== undefined && typeof c === 'number') {
            validCloses.push(c);
          }
        }
        
        let chg24: number | null = null;
        if (meta?.regularMarketChangePercent !== undefined) {
          chg24 = meta.regularMarketChangePercent;
        } else if (validCloses.length >= 2) {
          const current = validCloses[validCloses.length - 1];
          const previous = validCloses[validCloses.length - 2];
          if (previous && previous !== 0) {
            chg24 = ((current - previous) / previous) * 100;
          }
        }
        
        const price = meta?.regularMarketPrice ?? meta?.previousClose ?? (validCloses.length > 0 ? validCloses[validCloses.length - 1] : null);
        
        // Use default market cap if provided, otherwise try to get from API
        const mcap = defaultMcaps?.[key] ?? meta?.marketCap ?? null;
        
        return {
          key,
          data: {
            key,
            price,
            mcap,
            chg24,
            sparkline: validCloses.length > 0 ? validCloses.slice(-18) : null,
          } as QuoteData
        };
      } catch (e) {
        console.error(`Failed to fetch chart for ${symbol}:`, e);
        return { key, data: null };
      }
    });
    
    const batchResults = await Promise.all(promises);
    
    for (const { key, data } of batchResults) {
      if (data) {
        results.set(key, data);
      }
    }
    
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Generate synthetic sparkline based on price movement
function generateSparkline(chg24: number | null, basePrice: number): number[] {
  const points = 18;
  const spark: number[] = [];
  const change = chg24 ?? 0;
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * 0.002;
    const factor = 1 - (change / 100) * (1 - progress) + noise;
    spark.push(basePrice * factor);
  }
  
  return spark;
}

export async function GET() {
  // Fetch from all sources in parallel
  const [cryptoQuotes, equityQuotes, indexQuotes, commodityQuotes, agricultureQuotes, fxQuotes, etfQuotes] = await Promise.all([
    fetchCryptoQuotes(),
    fetchEquityQuotes(),
    fetchYahooChartQuotes(INDEX_SYMBOLS, INDEX_MARKET_CAPS),
    fetchYahooChartQuotes(COMMODITY_SYMBOLS, COMMODITY_MARKET_SIZES),
    fetchYahooChartQuotes(AGRICULTURE_SYMBOLS, AGRICULTURE_MARKET_SIZES),
    fetchYahooChartQuotes(FX_SYMBOLS, null),
    fetchYahooChartQuotes(ETF_SYMBOLS, ETF_MARKET_CAPS),
  ]);
  
  // Merge results
  const allQuotes: Record<string, QuoteData> = {};
  
  const addQuotes = (quotes: Map<string, QuoteData>) => {
    quotes.forEach((data, key) => {
      // Generate sparkline if missing
      if (data.price && (!data.sparkline || data.sparkline.length < 5)) {
        data.sparkline = generateSparkline(data.chg24, data.price);
      }
      allQuotes[key] = data;
    });
  };
  
  addQuotes(cryptoQuotes);
  addQuotes(equityQuotes);
  addQuotes(indexQuotes);
  addQuotes(commodityQuotes);
  addQuotes(agricultureQuotes);
  addQuotes(fxQuotes);
  addQuotes(etfQuotes);
  
  return NextResponse.json({
    success: true,
    quotes: allQuotes,
    fetchedAt: new Date().toISOString(),
    sources: {
      crypto: cryptoQuotes.size,
      equity: equityQuotes.size,
      index: indexQuotes.size,
      commodity: commodityQuotes.size,
      agriculture: agricultureQuotes.size,
      fx: fxQuotes.size,
      etf: etfQuotes.size,
    },
  });
}
