import { kv } from '@vercel/kv';
import crypto from 'crypto';

// Twitter API credentials
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';

interface AnalyzedHeadline {
  id: string;
  text: string;
  sourceName?: string;
  impactScore: number;
  impactLevel: 'Severe' | 'High' | 'Medium' | 'Low';
  assets: Array<{
    asset: string;
    direction: 'Bullish' | 'Bearish' | 'Neutral';
    rationale?: string;
  }>;
  research?: {
    summary?: string;
  } | null;
  ts: number | string;
}

// OAuth 1.0a signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmac = crypto.createHmac('sha1', signingKey);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

// Generate OAuth header
function generateOAuthHeader(method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_SECRET
  );

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

// Post tweet
async function postTweet(text: string): Promise<{ success: boolean; tweetId?: string; error?: string; rateLimited?: boolean }> {
  const url = 'https://api.twitter.com/2/tweets';
  
  try {
    const body = JSON.stringify({ text });
    const authHeader = generateOAuthHeader('POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twitter API error:', JSON.stringify(data, null, 2));
      
      if (response.status === 429) {
        return { success: false, error: 'Rate limited', rateLimited: true };
      }
      
      return { 
        success: false, 
        error: data.detail || data.title || `HTTP ${response.status}`
      };
    }

    return { success: true, tweetId: data.data?.id };
  } catch (error) {
    console.error('Failed to post tweet:', error);
    return { success: false, error: String(error) };
  }
}

// Format tweet
function formatTweetText(headline: AnalyzedHeadline): string {
  const lines: string[] = [];
  
  lines.push('[SISTINE]');
  lines.push('');
  lines.push(headline.text);
  lines.push('');
  lines.push('Expected Market Impact:');
  lines.push('');
  
  const assets = (headline.assets || []).slice(0, 3);
  for (const asset of assets) {
    const arrow = asset.direction === 'Bullish' ? '↑' : asset.direction === 'Bearish' ? '↓' : '→';
    lines.push(`${arrow} ${asset.asset.toUpperCase()} ${asset.rationale || ''}`);
    lines.push('');
  }
  
  if (headline.research?.summary) {
    lines.push(headline.research.summary);
  }
  
  return lines.join('\n').trim();
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/federal reserve/g, 'fed')
    .replace(/fed chair/g, 'fed')
    .replace(/jerome powell/g, 'powell fed')
    .replace(/fomc/g, 'fed')
    .replace(/interest rate/g, 'rate')
    .replace(/rates steady/g, 'rate hold')
    .replace(/rates unchanged/g, 'rate hold')
    .replace(/holds rate/g, 'rate hold')
    .replace(/keeps rate/g, 'rate hold')
    .replace(/rate cut/g, 'rate cut')
    .replace(/rate hike/g, 'rate hike')
    .replace(/donald trump/g, 'trump')
    .replace(/president trump/g, 'trump')
    .replace(/tariffs/g, 'tariff')
    .replace(/import duties/g, 'tariff')
    .replace(/chinese/g, 'china')
    .replace(/beijing/g, 'china')
    .replace(/united states/g, 'us')
    .replace(/u\.s\./g, 'us')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract key terms
function extractKeyTerms(text: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'says', 'said', 'new', 'after', 'about', 'from', 'up', 'out', 'more', 'also', 'now', 'what', 'who', 'when', 'where', 'which', 'report', 'reports', 'according', 'sources', 'amid', 'despite', 'latest', 'breaking', 'update', 'live', 'just', 'today']);
  
  const normalized = normalizeText(text);
  
  return new Set(
    normalized
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  );
}

// Check if headline is similar to any recently tweeted
function isSimilarToRecent(headlineText: string, recentTweets: string[]): boolean {
  const terms1 = extractKeyTerms(headlineText);
  
  for (const recentText of recentTweets) {
    const terms2 = extractKeyTerms(recentText);
    
    if (terms1.size < 3 || terms2.size < 3) continue;
    
    // Count overlapping terms
    let overlap = 0;
    terms1.forEach(term => {
      if (terms2.has(term)) overlap++;
    });
    
    const minSize = Math.min(terms1.size, terms2.size);
    const overlapRatio = overlap / minSize;
    
    // If >50% overlap, consider it the same story
    if (overlapRatio > 0.5) {
      console.log(`Similar to recent tweet (${(overlapRatio * 100).toFixed(0)}% overlap): "${recentText.substring(0, 50)}..."`);
      return true;
    }
  }
  
  return false;
}

// Get headline timestamp as number
function getHeadlineTs(headline: AnalyzedHeadline): number {
  if (typeof headline.ts === 'number') return headline.ts;
  return new Date(headline.ts).getTime();
}

export async function GET(request: Request) {
  console.log('=== AUTO-TWEET CRON ===');
  
  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return Response.json({ error: 'Twitter credentials not configured' }, { status: 500 });
  }

  try {
    const now = Date.now();
    
    // Get the timestamp of our last check
    const lastCheckTime = await kv.get<number>('auto-tweet:last-check') || 0;
    console.log(`Last check: ${lastCheckTime ? new Date(lastCheckTime).toISOString() : 'never'}`);
    
    // ALWAYS update last check time to NOW first
    await kv.set('auto-tweet:last-check', now);

    // If first run, just set baseline and exit
    if (lastCheckTime === 0) {
      console.log('First run - setting baseline');
      return Response.json({ success: true, message: 'First run - baseline set' });
    }

    // Check rate limit
    const rateLimitUntil = await kv.get<number>('twitter-rate-limit-until');
    if (rateLimitUntil && rateLimitUntil > now) {
      return Response.json({ success: true, message: 'Rate limited' });
    }

    // Get recent tweeted headlines for deduplication (last 100)
    const recentTweeted = await kv.lrange<string>('auto-tweet:recent-headlines', 0, 99) || [];
    console.log(`Have ${recentTweeted.length} recent tweets to compare against`);

    // Get headlines
    const cachedData = await kv.get('analyzed-news:data') as { items: AnalyzedHeadline[] } | null;
    if (!cachedData?.items?.length) {
      return Response.json({ success: true, message: 'No headlines' });
    }

    // Filter for High/Severe headlines that are NEW (after last check)
    const newHighImpact = cachedData.items.filter(h => {
      const ts = getHeadlineTs(h);
      const isHighImpact = h.impactLevel === 'High' || h.impactLevel === 'Severe';
      const isNew = ts > lastCheckTime;
      return isHighImpact && isNew;
    });

    console.log(`Found ${newHighImpact.length} NEW High/Severe headlines since last check`);

    if (newHighImpact.length === 0) {
      return Response.json({ success: true, message: 'No new High/Severe headlines' });
    }

    // Sort by timestamp (oldest first)
    newHighImpact.sort((a, b) => getHeadlineTs(a) - getHeadlineTs(b));

    // Process each headline
    const results = [];
    const tweetedThisBatch: string[] = []; // Track what we tweet this run
    
    for (const headline of newHighImpact) {
      // Check if similar to recently tweeted (from previous runs)
      if (isSimilarToRecent(headline.text, recentTweeted)) {
        console.log(`Skipping (similar to past tweet): ${headline.text.substring(0, 50)}...`);
        results.push({ headline: headline.text.substring(0, 50), skipped: 'similar to recent tweet' });
        continue;
      }
      
      // Check if similar to something we already tweeted THIS batch
      if (isSimilarToRecent(headline.text, tweetedThisBatch)) {
        console.log(`Skipping (similar to earlier in batch): ${headline.text.substring(0, 50)}...`);
        results.push({ headline: headline.text.substring(0, 50), skipped: 'similar to earlier tweet this batch' });
        continue;
      }
      
      // Format and post tweet
      const tweetText = formatTweetText(headline);
      console.log(`Tweeting: ${headline.text.substring(0, 50)}...`);
      
      const result = await postTweet(tweetText);
      
      if (result.rateLimited) {
        await kv.set('twitter-rate-limit-until', now + 15 * 60 * 1000);
        results.push({ headline: headline.text.substring(0, 50), error: 'Rate limited' });
        break;
      }
      
      if (result.success) {
        console.log(`Tweeted! ID: ${result.tweetId}`);
        
        // Track for same-batch deduplication
        tweetedThisBatch.push(headline.text);
        
        // Add to recent headlines list for future deduplication
        await kv.lpush('auto-tweet:recent-headlines', headline.text);
        // Keep only last 100
        await kv.ltrim('auto-tweet:recent-headlines', 0, 99);
        
        results.push({ headline: headline.text.substring(0, 50), tweetId: result.tweetId });
      } else if (result.error?.includes('duplicate')) {
        // Twitter says duplicate - add to tracking lists anyway
        console.log('Twitter rejected as duplicate');
        tweetedThisBatch.push(headline.text);
        await kv.lpush('auto-tweet:recent-headlines', headline.text);
        await kv.ltrim('auto-tweet:recent-headlines', 0, 99);
        results.push({ headline: headline.text.substring(0, 50), skipped: 'Twitter duplicate' });
      } else {
        console.log(`Failed: ${result.error}`);
        results.push({ headline: headline.text.substring(0, 50), error: result.error });
      }
      
      // Small delay between tweets
      if (newHighImpact.indexOf(headline) < newHighImpact.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return Response.json({ success: true, results });
    
  } catch (error) {
    console.error('Auto-tweet error:', error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
