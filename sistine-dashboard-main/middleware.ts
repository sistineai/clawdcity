import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhook(.*)',
  '/api/create-checkout(.*)',
  '/api/cron/(.*)',
  '/api/ghost-newsletters(.*)',
  '/api/og/(.*)',
  '/api/quotes(.*)',
  // NOTE: /api/analyzed-news is intentionally NOT public - requires auth
])

export default clerkMiddleware(async (auth, req) => {
  // Explicitly allow cron routes (check pathname directly)
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }
  
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect dashboard routes - require sign in
  if (isProtectedRoute(req)) {
    const { userId } = await auth()
    
    if (!userId) {
      const signInUrl = new URL('/', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
