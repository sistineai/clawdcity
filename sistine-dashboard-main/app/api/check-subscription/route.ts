import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Free users whitelist (comma-separated Clerk user IDs or emails)
const FREE_USERS = (process.env.FREE_USER_IDS || '').split(',').filter(Boolean);
const FREE_EMAILS = (process.env.FREE_USER_EMAILS || '').split(',').filter(Boolean).map(e => e.toLowerCase().trim());

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ hasActiveSubscription: false }, { status: 401 })
    }
    
    // Check if user is on free whitelist
    if (FREE_USERS.includes(userId)) {
      return NextResponse.json({ 
        hasActiveSubscription: true,
        status: 'free_tier'
      })
    }
    
    const user = await currentUser()
    
    // Check if email is on free whitelist
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    if (userEmail && FREE_EMAILS.includes(userEmail)) {
      return NextResponse.json({ 
        hasActiveSubscription: true,
        status: 'free_tier'
      })
    }
    
    const subscriptionStatus = user?.privateMetadata?.subscriptionStatus as string | null

    const hasActiveSubscription = subscriptionStatus === 'active'

    return NextResponse.json({ 
      hasActiveSubscription,
      status: subscriptionStatus || 'none'
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json({ hasActiveSubscription: false, error: 'Check failed' }, { status: 500 })
  }
}
