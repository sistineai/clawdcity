import { kv } from '@vercel/kv';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

// Generate Ghost Admin API JWT token
function generateGhostToken(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(':');
  
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: id
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 5 * 60, // 5 minutes
    aud: '/admin/'
  };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Generate newsletter HTML content for Ghost
function generateNewsletterHTML(headlines: AnalyzedHeadline[]): string {
  const headlineBlocks = headlines.map((h, index) => {
    const impactColor = h.impactLevel === 'High' ? '#ef4444' : h.impactLevel === 'Medium' ? '#f59e0b' : '#22c55e';
    const impactBg = h.impactLevel === 'High' ? '#fef2f2' : h.impactLevel === 'Medium' ? '#fffbeb' : '#f0fdf4';
    
    const assetsHtml = h.assets.slice(0, 4).map(a => {
      const color = a.direction === 'Bullish' ? '#16a34a' : a.direction === 'Bearish' ? '#dc2626' : '#6b7280';
      const bg = a.direction === 'Bullish' ? '#f0fdf4' : a.direction === 'Bearish' ? '#fef2f2' : '#f3f4f6';
      const arrow = a.direction === 'Bullish' ? '↑' : a.direction === 'Bearish' ? '↓' : '→';
      return `<span style="display:inline-block;background:${bg};color:${color};padding:4px 10px;border-radius:6px;font-size:13px;margin:3px 4px 3px 0;font-weight:500;">${arrow} ${a.asset}</span>`;
    }).join('');
    
    const summary = h.research?.summary || '';
    
    return `
      <div style="background:#ffffff;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #e5e7eb;">
        <div style="margin-bottom:12px;">
          <span style="display:inline-block;background:#facc15;color:#1a1a1a;font-weight:700;font-size:16px;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px;margin-right:10px;">${index + 1}</span>
          <span style="display:inline-block;background:${impactBg};color:${impactColor};padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">${h.impactLevel} Impact</span>
          <span style="color:#9ca3af;font-size:12px;margin-left:8px;">${h.sourceName || 'News'}</span>
        </div>
        <h3 style="margin:0 0 12px 0;font-size:17px;font-weight:600;color:#111827;line-height:1.5;">${h.text}</h3>
        ${summary ? `<p style="margin:0 0 14px 0;font-size:14px;color:#4b5563;line-height:1.6;padding:12px;background:#f9fafb;border-radius:8px;border-left:3px solid #facc15;">${summary}</p>` : ''}
        <div>${assetsHtml}</div>
      </div>
    `;
  }).join('');

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!--kg-card-begin: html-->
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  
  <div style="text-align:center;margin-bottom:30px;">
    <p style="margin:0;font-size:14px;color:#6b7280;">${date}</p>
    <h1 style="margin:10px 0 0;font-size:28px;font-weight:700;color:#111827;">🔥 Today's Top Market Movers</h1>
  </div>

  ${headlineBlocks}

  <div style="background:linear-gradient(135deg,#facc15 0%,#f59e0b 100%);border-radius:12px;padding:28px;text-align:center;margin-top:30px;">
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#1a1a1a;">Want Real-Time Alerts?</h2>
    <p style="margin:0 0 18px;font-size:14px;color:#1a1a1a;opacity:0.85;">Get instant AI-powered analysis on every market-moving headline.</p>
    <a href="https://sistine.ai" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Try the Live Dashboard →</a>
  </div>

</div>
<!--kg-card-end: html-->
  `;
}

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Ghost configuration
  const ghostUrl = process.env.GHOST_URL; // e.g., https://your-site.ghost.io
  const ghostAdminKey = process.env.GHOST_ADMIN_API_KEY; // format: {id}:{secret}
  const ghostNewsletterId = process.env.GHOST_NEWSLETTER_ID; // optional: specific newsletter ID

  if (!ghostUrl || !ghostAdminKey) {
    return Response.json({ 
      error: 'Ghost not configured',
      hint: 'Set GHOST_URL and GHOST_ADMIN_API_KEY in Vercel env vars'
    }, { status: 500 });
  }

  try {
    // Fetch recent headlines
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sistine.ai';
    const response = await fetch(`${baseUrl}/api/analyzed-news`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch headlines' }, { status: 500 });
    }

    const data = await response.json();
    const headlines: AnalyzedHeadline[] = data.items || [];

    // Filter for High/Medium impact from last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const topHeadlines = headlines
      .filter(h => {
        const ts = typeof h.ts === 'number' ? h.ts : new Date(h.ts).getTime();
        return ts > oneDayAgo && (h.impactLevel === 'High' || h.impactLevel === 'Medium');
      })
      .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))
      .slice(0, 3);

    if (topHeadlines.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No high-impact headlines to send',
        sent: false 
      });
    }

    // Generate content
    const htmlContent = generateNewsletterHTML(topHeadlines);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const title = `Daily Market Briefing - ${date}`;
    
    // First headline for email subject
    const firstHeadline = topHeadlines[0].text.length > 60 
      ? topHeadlines[0].text.substring(0, 57) + '...'
      : topHeadlines[0].text;

    // Generate Ghost JWT token
    const token = generateGhostToken(ghostAdminKey);

    const newsletterId = ghostNewsletterId || '';
    
    // Create and publish post - newsletter ID in URL, email_segment in body
    const ghostApiUrl = `${ghostUrl.replace(/\/$/, '')}/ghost/api/admin/posts/?source=html${newsletterId ? `&newsletter=${newsletterId}` : ''}`;
    
    const postPayload: Record<string, unknown> = {
      title: title,
      html: htmlContent,
      status: 'published',
      visibility: 'public',
      email_subject: `📊 ${firstHeadline}`,
      tags: [{ name: 'Market Briefing' }, { name: 'Newsletter' }],
      email_segment: 'all',  // Send to all newsletter subscribers
    };

    const postData = { posts: [postPayload] };

    console.log('Creating Ghost post at URL:', ghostApiUrl);
    console.log('Post data:', JSON.stringify(postData, null, 2));

    const ghostResponse = await fetch(ghostApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const ghostResult = await ghostResponse.json();

    if (!ghostResponse.ok) {
      console.error('Ghost API error:', JSON.stringify(ghostResult, null, 2));
      
      const errorContext = ghostResult.errors?.[0]?.context || '';
      const errorMessage = ghostResult.errors?.[0]?.message || '';
      
      if (errorContext.includes('newsletter') || errorMessage.includes('newsletter')) {
        return Response.json({ 
          error: 'Newsletter configuration error',
          details: ghostResult,
          hint: 'Check GHOST_NEWSLETTER_ID is correct'
        }, { status: 500 });
      }
      
      return Response.json({ 
        error: 'Failed to create Ghost post',
        details: ghostResult 
      }, { status: 500 });
    }

    // Check if email was sent
    const post = ghostResult.posts?.[0];
    const emailSent = post?.email?.status === 'submitted' || post?.email?.status === 'pending';

    // Log full response for debugging
    console.log('Ghost API response:', JSON.stringify({
      postId: post?.id,
      postUrl: post?.url,
      postStatus: post?.status,
      postVisibility: post?.visibility,
      email: post?.email,
      newsletter: post?.newsletter,
    }, null, 2));

    // Log successful send
    await kv.set('last-newsletter-sent', {
      timestamp: Date.now(),
      postId: post?.id,
      postUrl: post?.url,
      emailStatus: post?.email?.status || 'no-email',
      headlines: topHeadlines.map(h => h.id),
    }, { ex: 60 * 60 * 24 * 7 }); // Keep for 7 days

    return Response.json({
      success: true,
      postId: post?.id,
      postUrl: post?.url,
      postStatus: post?.status,
      postVisibility: post?.visibility,
      title: title,
      emailSent: emailSent,
      emailStatus: post?.email?.status || 'not-triggered',
      emailDetails: post?.email || null,
      newsletterDetails: post?.newsletter || null,
      headlines: topHeadlines.map(h => ({
        id: h.id,
        text: h.text.substring(0, 60) + '...',
        impactLevel: h.impactLevel,
      })),
    });

  } catch (error) {
    console.error('Newsletter error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
