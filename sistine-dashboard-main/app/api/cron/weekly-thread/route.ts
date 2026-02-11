import { kv } from '@vercel/kv';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Twitter OAuth credentials
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';

interface AnalyzedHeadline {
  id: string;
  text: string;
  sourceName?: string;
  handle?: string;
  impactScore: number;
  impactLevel: 'High' | 'Medium' | 'Low';
  country?: string;
  assets: Array<{
    asset: string;
    direction: 'Bullish' | 'Bearish' | 'Neutral';
    rationale?: string;
    assetClass?: string;
  }>;
  research?: {
    summary?: string;
  } | null;
  ts: number | string;
}

// Generate OAuth 1.0a signature
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
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
}

// Generate OAuth header for Twitter API
function generateOAuthHeader(method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_SECRET
  );

  oauthParams.oauth_signature = signature;

  const headerString = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

// Post a single tweet, optionally as a reply
async function postTweet(text: string, replyToId?: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const url = 'https://api.twitter.com/2/tweets';
  
  try {
    const body: Record<string, unknown> = { text };
    
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }
    
    const authHeader = generateOAuthHeader('POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twitter API error:', data);
      return { success: false, error: data.detail || data.title || `HTTP ${response.status}` };
    }

    return { success: true, tweetId: data.data?.id };
  } catch (error) {
    console.error('Failed to post tweet:', error);
    return { success: false, error: String(error) };
  }
}

// Format asset impacts for a tweet (no $ cashtags to avoid spam detection)
function formatAssets(assets: AnalyzedHeadline['assets']): string {
  const bullish = assets.filter(a => a.direction === 'Bullish').map(a => a.asset);
  const bearish = assets.filter(a => a.direction === 'Bearish').map(a => a.asset);
  
  const lines: string[] = [];
  if (bullish.length > 0) {
    lines.push(`↑ ${bullish.slice(0, 4).join(', ')}`);
  }
  if (bearish.length > 0) {
    lines.push(`↓ ${bearish.slice(0, 4).join(', ')}`);
  }
  
  return lines.join('\n');
}

// Truncate text to fit Twitter limits
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Generate thread tweets from headlines
function generateThread(headlines: AnalyzedHeadline[]): string[] {
  const tweets: string[] = [];
  
  // Tweet 1: Hook
  tweets.push(`🧵 ${headlines.length} headlines that moved markets this week

And what they mean for your portfolio ↓`);
  
  // Headlines tweets
  headlines.forEach((headline, index) => {
    const num = index + 1;
    const summary = headline.research?.summary || '';
    const assets = formatAssets(headline.assets);
    
    // Build the tweet content
    let tweetText = `${num}/ ${truncateText(headline.text, 180)}`;
    
    if (summary) {
      // Add a shortened "Why it matters" section
      const shortSummary = truncateText(summary, 120);
      tweetText += `\n\nWhy it matters:\n${shortSummary}`;
    }
    
    if (assets) {
      tweetText += `\n\n${assets}`;
    }
    
    // Ensure tweet is under 280 chars
    if (tweetText.length > 280) {
      // Rebuild with shorter content
      tweetText = `${num}/ ${truncateText(headline.text, 200)}`;
      if (assets) {
        tweetText += `\n\n${assets}`;
      }
    }
    
    tweets.push(tweetText);
  });
  
  // Final tweet: CTA
  tweets.push(`Want these insights in real-time?

Not a week later?

Our AI analyzes every market headline as it breaks.

Free daily briefing: sistine.ai/newsletter

Live dashboard: sistine.ai`);
  
  return tweets;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Twitter credentials
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return Response.json({ 
      error: 'Twitter API credentials not configured'
    }, { status: 500 });
  }

  const url = new URL(request.url);
  const forceBypass = url.searchParams.get('force') === 'true';
  const debugMode = url.searchParams.get('debug') === 'true';

  try {
    // Check if we already posted a thread this week
    const lastThread = await kv.get<{ timestamp: number; tweetIds: string[] }>('last-weekly-thread');
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    if (!forceBypass && lastThread && lastThread.timestamp > oneWeekAgo) {
      const daysUntilNext = Math.ceil((lastThread.timestamp + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
      return Response.json({
        success: true,
        message: `Already posted this week. Next thread in ${daysUntilNext} days.`,
        lastPosted: new Date(lastThread.timestamp).toISOString()
      });
    }

    // Fetch headlines from the past week
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sistine.ai';
    const response = await fetch(`${baseUrl}/api/analyzed-news`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch headlines' }, { status: 500 });
    }

    const data = await response.json();
    const headlines: AnalyzedHeadline[] = data.items || [];

    // Filter for High/Medium impact from last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const topHeadlines = headlines
      .filter(h => {
        const ts = typeof h.ts === 'number' ? h.ts : new Date(h.ts).getTime();
        return ts > sevenDaysAgo && (h.impactLevel === 'High' || h.impactLevel === 'Medium');
      })
      .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))
      .slice(0, 5);

    if (topHeadlines.length < 3) {
      return Response.json({ 
        success: false, 
        message: 'Not enough high-impact headlines this week',
        found: topHeadlines.length
      });
    }

    // Generate thread content
    const threadTweets = generateThread(topHeadlines);

    // Debug mode: return thread without posting
    if (debugMode) {
      return Response.json({
        debug: true,
        threadLength: threadTweets.length,
        tweets: threadTweets,
        headlines: topHeadlines.map(h => ({
          text: h.text.substring(0, 60) + '...',
          impactLevel: h.impactLevel,
          impactScore: h.impactScore
        }))
      });
    }

    // Post the thread
    const postedTweets: { index: number; tweetId?: string; error?: string }[] = [];
    let previousTweetId: string | undefined;

    for (let i = 0; i < threadTweets.length; i++) {
      const tweetText = threadTweets[i];
      
      // Add delay between tweets to avoid rate limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const result = await postTweet(tweetText, previousTweetId);
      
      postedTweets.push({
        index: i,
        tweetId: result.tweetId,
        error: result.error
      });

      if (result.success && result.tweetId) {
        previousTweetId = result.tweetId;
      } else {
        // If a tweet fails, stop the thread
        console.error(`Tweet ${i} failed:`, result.error);
        break;
      }
    }

    const successCount = postedTweets.filter(t => t.tweetId).length;
    const firstTweetId = postedTweets[0]?.tweetId;

    // Save record of the thread
    if (successCount > 0) {
      await kv.set('last-weekly-thread', {
        timestamp: Date.now(),
        tweetIds: postedTweets.filter(t => t.tweetId).map(t => t.tweetId),
        headlineIds: topHeadlines.map(h => h.id)
      }, { ex: 60 * 60 * 24 * 14 }); // Keep for 14 days
    }

    return Response.json({
      success: successCount === threadTweets.length,
      posted: successCount,
      total: threadTweets.length,
      threadUrl: firstTweetId ? `https://twitter.com/i/status/${firstTweetId}` : null,
      tweets: postedTweets
    });

  } catch (error) {
    console.error('Weekly thread error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
