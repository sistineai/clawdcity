export const dynamic = "force-dynamic";
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.metadata?.clerkUserId
        const customerId = session.customer as string

        if (clerkUserId && customerId) {
          const clerk = await clerkClient()
          await clerk.users.updateUserMetadata(clerkUserId, {
            privateMetadata: {
              stripeCustomerId: customerId,
              subscriptionStatus: 'active',
              subscriptionId: session.subscription as string,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const clerkUserId = subscription.metadata?.clerkUserId

        if (clerkUserId) {
          const status = subscription.status === 'active' || subscription.status === 'trialing'
            ? 'active'
            : 'inactive'

          const clerk = await clerkClient()
          await clerk.users.updateUserMetadata(clerkUserId, {
            privateMetadata: {
              subscriptionStatus: status,
              subscriptionId: subscription.id,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const clerkUserId = subscription.metadata?.clerkUserId

        if (clerkUserId) {
          const clerk = await clerkClient()
          await clerk.users.updateUserMetadata(clerkUserId, {
            privateMetadata: {
              subscriptionStatus: 'canceled',
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const clerkUserId = subscription.metadata?.clerkUserId

          if (clerkUserId) {
            const clerk = await clerkClient()
            await clerk.users.updateUserMetadata(clerkUserId, {
              privateMetadata: {
                subscriptionStatus: 'past_due',
              },
            })
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
