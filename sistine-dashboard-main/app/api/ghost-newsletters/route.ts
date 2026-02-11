import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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
    exp: now + 5 * 60,
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

export async function GET(request: Request) {
  // Verify auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ghostUrl = process.env.GHOST_URL;
  const ghostAdminKey = process.env.GHOST_ADMIN_API_KEY;

  if (!ghostUrl || !ghostAdminKey) {
    return Response.json({ 
      error: 'Ghost not configured',
      hint: 'Set GHOST_URL and GHOST_ADMIN_API_KEY'
    }, { status: 500 });
  }

  try {
    const token = generateGhostToken(ghostAdminKey);
    const apiUrl = `${ghostUrl.replace(/\/$/, '')}/ghost/api/admin/newsletters/`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: 'Failed to fetch newsletters',
        details: result 
      }, { status: 500 });
    }

    // Return newsletter info
    const newsletters = result.newsletters?.map((n: Record<string, unknown>) => ({
      id: n.id,
      name: n.name,
      slug: n.slug,
      status: n.status,
      subscribe_on_signup: n.subscribe_on_signup,
      member_count: (n.count as Record<string, number> | undefined)?.members || 0,
    })) || [];

    return Response.json({
      success: true,
      newsletters,
      hint: 'Set GHOST_NEWSLETTER_ID to the id of the newsletter you want to use',
    });

  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
