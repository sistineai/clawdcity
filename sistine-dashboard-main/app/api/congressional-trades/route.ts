import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

// Free data sources - no API key needed
const HOUSE_DATA_URL = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
const SENATE_DATA_URL = 'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json';

interface HouseTrade {
  transaction_date: string;
  disclosure_date: string;
  representative: string;
  ticker: string;
  asset_description: string;
  type: string; // "purchase" or "sale_full" or "sale_partial"
  amount: string;
  party: string;
  district: string;
  state: string;
}

interface SenateTrade {
  transaction_date: string;
  disclosure_date: string;
  senator: string;
  ticker: string;
  asset_description: string;
  type: string;
  amount: string;
  party: string;
}

interface CongressionalTrade {
  id: string;
  date: string;
  disclosureDate: string;
  politician: string;
  chamber: 'House' | 'Senate';
  party: string;
  state?: string;
  ticker: string;
  asset: string;
  type: 'Buy' | 'Sell';
  amount: string;
  amountLow: number;
  amountHigh: number;
}

// Parse amount range like "$1,001 - $15,000"
function parseAmount(amount: string): { low: number; high: number } {
  const cleaned = amount.replace(/[$,]/g, '');
  const match = cleaned.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return { low: parseInt(match[1]), high: parseInt(match[2]) };
  }
  // Try single number
  const single = parseInt(cleaned);
  if (!isNaN(single)) {
    return { low: single, high: single };
  }
  return { low: 0, high: 0 };
}

// Normalize trade type
function normalizeType(type: string): 'Buy' | 'Sell' {
  const t = type.toLowerCase();
  if (t.includes('purchase') || t.includes('buy')) return 'Buy';
  return 'Sell';
}

// Fetch and process House trades
async function fetchHouseTrades(): Promise<CongressionalTrade[]> {
  try {
    const response = await fetch(HOUSE_DATA_URL, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.error('House data fetch failed:', response.status);
      return [];
    }
    
    const data: HouseTrade[] = await response.json();
    
    // Get trades from last 48 hours
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    
    return data
      .filter(trade => {
        if (!trade.ticker || trade.ticker === '--' || trade.ticker === 'N/A') return false;
        const tradeDate = new Date(trade.transaction_date);
        return tradeDate >= cutoff;
      })
      .map(trade => {
        const amounts = parseAmount(trade.amount);
        return {
          id: `house-${trade.representative}-${trade.ticker}-${trade.transaction_date}`,
          date: trade.transaction_date,
          disclosureDate: trade.disclosure_date,
          politician: trade.representative,
          chamber: 'House' as const,
          party: trade.party || 'Unknown',
          state: trade.state,
          ticker: trade.ticker.toUpperCase(),
          asset: trade.asset_description,
          type: normalizeType(trade.type),
          amount: trade.amount,
          amountLow: amounts.low,
          amountHigh: amounts.high,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching House trades:', error);
    return [];
  }
}

// Fetch and process Senate trades
async function fetchSenateTrades(): Promise<CongressionalTrade[]> {
  try {
    const response = await fetch(SENATE_DATA_URL, {
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      console.error('Senate data fetch failed:', response.status);
      return [];
    }
    
    const data: SenateTrade[] = await response.json();
    
    // Get trades from last 48 hours
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    
    return data
      .filter(trade => {
        if (!trade.ticker || trade.ticker === '--' || trade.ticker === 'N/A') return false;
        const tradeDate = new Date(trade.transaction_date);
        return tradeDate >= cutoff;
      })
      .map(trade => {
        const amounts = parseAmount(trade.amount);
        return {
          id: `senate-${trade.senator}-${trade.ticker}-${trade.transaction_date}`,
          date: trade.transaction_date,
          disclosureDate: trade.disclosure_date,
          politician: trade.senator,
          chamber: 'Senate' as const,
          party: trade.party || 'Unknown',
          ticker: trade.ticker.toUpperCase(),
          asset: trade.asset_description,
          type: normalizeType(trade.type),
          amount: trade.amount,
          amountLow: amounts.low,
          amountHigh: amounts.high,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching Senate trades:', error);
    return [];
  }
}

// Aggregate trades by ticker to find notable activity
function aggregateTrades(trades: CongressionalTrade[]) {
  const byTicker: Record<string, { 
    ticker: string;
    buys: number;
    sells: number;
    buyVolume: number;
    sellVolume: number;
    politicians: Set<string>;
    recentTrades: CongressionalTrade[];
  }> = {};
  
  for (const trade of trades) {
    if (!byTicker[trade.ticker]) {
      byTicker[trade.ticker] = {
        ticker: trade.ticker,
        buys: 0,
        sells: 0,
        buyVolume: 0,
        sellVolume: 0,
        politicians: new Set(),
        recentTrades: [],
      };
    }
    
    const entry = byTicker[trade.ticker];
    entry.politicians.add(trade.politician);
    entry.recentTrades.push(trade);
    
    if (trade.type === 'Buy') {
      entry.buys++;
      entry.buyVolume += trade.amountHigh;
    } else {
      entry.sells++;
      entry.sellVolume += trade.amountHigh;
    }
  }
  
  // Convert to array and calculate signal strength
  return Object.values(byTicker)
    .map(entry => ({
      ticker: entry.ticker,
      buys: entry.buys,
      sells: entry.sells,
      buyVolume: entry.buyVolume,
      sellVolume: entry.sellVolume,
      politicianCount: entry.politicians.size,
      netSentiment: entry.buys - entry.sells,
      recentTrades: entry.recentTrades.slice(0, 5),
    }))
    .filter(entry => entry.buys + entry.sells >= 2) // At least 2 trades
    .sort((a, b) => Math.abs(b.netSentiment) - Math.abs(a.netSentiment));
}

export async function GET() {
  try {
    // Check cache first
    const cacheKey = 'congressional-trades:data';
    const cached = await kv.get(cacheKey) as { trades: CongressionalTrade[]; aggregated: ReturnType<typeof aggregateTrades>; updatedAt: number } | null;
    
    // Return cache if less than 1 hour old
    if (cached && Date.now() - cached.updatedAt < 60 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        trades: cached.trades.slice(0, 100),
        aggregated: cached.aggregated.slice(0, 20),
        cached: true,
        updatedAt: new Date(cached.updatedAt).toISOString(),
      });
    }
    
    // Fetch fresh data
    const [houseTrades, senateTrades] = await Promise.all([
      fetchHouseTrades(),
      fetchSenateTrades(),
    ]);
    
    // Combine and sort by date
    const allTrades = [...houseTrades, ...senateTrades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Aggregate for signals
    const aggregated = aggregateTrades(allTrades);
    
    // Cache the results
    await kv.set(cacheKey, {
      trades: allTrades.slice(0, 500),
      aggregated,
      updatedAt: Date.now(),
    }, { ex: 2 * 60 * 60 }); // 2 hour expiry
    
    return NextResponse.json({
      success: true,
      trades: allTrades.slice(0, 100),
      aggregated: aggregated.slice(0, 20),
      cached: false,
      updatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Congressional trades API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch congressional trades',
      trades: [],
      aggregated: [],
    }, { status: 500 });
  }
}
