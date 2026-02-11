export const dynamic = "force-dynamic";
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe, PRICE_ID } from '@/lib/stripe'

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
    }

    // Check if user already has a Stripe customer ID
    const existingCustomerId = user.privateMetadata?.stripeCustomerId as string | undefined

    let customerId = existingCustomerId

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        metadata: {
          clerkUserId: userId,
        },
      })
      customerId = customer.id
    }

    // Create checkout session with 7-day free trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          clerkUserId: userId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
      metadata: {
        clerkUserId: userId,
      },
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.redirect(
      new URL('/?error=checkout_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    )
  }
}
