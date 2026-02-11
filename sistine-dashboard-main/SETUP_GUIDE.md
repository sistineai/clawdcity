# Sistine Research - Complete Setup Guide

## What's Included

- **AI-Powered Analysis** - Real-time market impact scoring and asset tagging
- **$49/month Subscription** - Stripe payments with 7-day free trial
- **User Authentication** - Clerk sign up/sign in
- **Self-Service Billing** - Users can cancel/update payment anytime (zero support)
- **Share to X** - One-click social sharing

---

## Quick Setup Checklist

1. [ ] Clerk account + API keys
2. [ ] Stripe webhook configured
3. [ ] Vercel environment variables
4. [ ] Deploy to Vercel

---

## Step 1: Clerk Setup (Authentication)

1. Go to **https://clerk.com** → Create application
2. Name: "Sistine Research"
3. Enable sign-in methods: **Email** and **Google** (optional)
4. Go to **API Keys** in sidebar
5. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## Step 2: Stripe Setup (Payments)

### Create Your Product
1. Go to **https://dashboard.stripe.com/products**
2. Click **+ Add product**
3. Name: "Sistine Research Pro"
4. Price: **$49** / month / recurring
5. Save and copy the **Price ID** (starts with `price_`)

### Enable Customer Portal (Self-Service Cancellation)
1. Go to **Settings → Billing → Customer portal**
2. Enable: ✅ "Customers can cancel subscriptions"
3. Enable: ✅ "Customers can update payment methods"
4. Save

### Create Webhook
1. Go to **Developers → Webhooks**
2. Click **+ Add endpoint**
3. URL: `https://YOUR-DOMAIN.vercel.app/api/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### Get API Keys
1. Go to **Developers → API Keys**
2. Copy:
   - `Publishable key` (starts with `pk_live_`)
   - `Secret key` (starts with `sk_live_`)

---

## Step 3: Vercel Environment Variables

Go to **Project → Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | pk_test_... or pk_live_... |
| `CLERK_SECRET_KEY` | sk_test_... or sk_live_... |
| `STRIPE_SECRET_KEY` | sk_live_... |
| `STRIPE_PRICE_ID` | price_... |
| `STRIPE_WEBHOOK_SECRET` | whsec_... |
| `NEXT_PUBLIC_APP_URL` | https://your-domain.vercel.app |
| `OPENAI_API_KEY` | sk-... |
| `CRON_SECRET` | (random string from generate-secret.vercel.app/32) |

**Note:** Vercel KV variables are auto-populated when you add the integration.

---

## Step 4: Deploy

```bash
git add .
git commit -m "Add paywall and authentication"
git push
```

---

## User Flow

```
Landing Page (sistine.ai)
        ↓
   [Get Started]
        ↓
   Clerk Sign Up
        ↓
   Stripe Checkout (7-day free trial)
        ↓
   Dashboard Access
        ↓
   [Billing button] → Stripe Portal (cancel/update card)
```

---

## Files Structure

```
├── middleware.ts              ← Route protection
├── lib/stripe.ts              ← Stripe client
├── .env.example               ← Environment template
├── app/
│   ├── layout.tsx             ← Clerk provider
│   ├── page.tsx               ← Landing page (public)
│   ├── dashboard/
│   │   ├── layout.tsx         ← Subscription check
│   │   └── page.tsx           ← Dashboard (protected)
│   └── api/
│       ├── create-checkout/   ← Stripe checkout
│       ├── webhook/           ← Stripe events
│       ├── billing-portal/    ← Self-service billing
│       ├── check-subscription/← Subscription status
│       ├── analyzed-news/     ← News API
│       └── cron/              ← Background jobs
```

---

## Testing

### Test the Full Flow
1. Visit your site (logged out) → See landing page
2. Click "Get Started" → Sign up with Clerk
3. Redirected to Stripe checkout → Enter test card `4242 4242 4242 4242`
4. Complete checkout → Redirected to dashboard
5. Click "Billing" → Opens Stripe portal

### Test Stripe Webhooks Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Support Scenarios (All Self-Service)

| User Question | Solution |
|---------------|----------|
| "How do I cancel?" | Click Billing → Cancel in Stripe Portal |
| "Update my card?" | Click Billing → Update in Stripe Portal |
| "Reset password?" | Handled automatically by Clerk |
| "Refund request?" | Email them via Stripe dashboard |

---

## Costs

| Service | Cost |
|---------|------|
| Clerk | Free (up to 10K users) |
| Stripe | 2.9% + $0.30 per transaction |
| Vercel | Free tier or $20/mo Pro |
| OpenAI | ~$30-50/mo for analysis |

**Revenue per customer:** $49 - ~$1.72 (Stripe) = **~$47.28/mo net**

---

## Troubleshooting

**User stuck after sign up?**
- Check Stripe webhook is receiving events
- Verify `STRIPE_WEBHOOK_SECRET` is correct

**Dashboard showing paywall to paid user?**
- Check user's `privateMetadata.subscriptionStatus` in Clerk dashboard
- Should be "active" for paying customers

**Webhook not firing?**
- Verify webhook URL is correct in Stripe
- Check Vercel function logs for errors
