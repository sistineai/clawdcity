export const dynamic = "force-dynamic";
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
    }

    const customerId = user.privateMetadata?.stripeCustomerId as string | undefined

    if (!customerId) {
      // No subscription yet, redirect to checkout
      return NextResponse.redirect(
        new URL('/api/create-checkout', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      )
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    })

    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=billing_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    )
  }
}
