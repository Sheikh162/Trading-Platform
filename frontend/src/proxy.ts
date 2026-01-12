import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// 1. Define Public Routes (Accessible without login)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/markets(.*)', // Added: Markets should be public
  '/unauthorized',
])

// 2. Define Admin Routes
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth()

  // A. Not signed in? -> Block access to private routes
  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn()
  }

  // B. Signed In? -> Handle Role-Based Redirects
  if (userId) {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const role = user.publicMetadata?.role

    // 1. Security Gate: Block non-admins from accessing /admin
    if (isAdminRoute(req) && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // 2. Admin Login: Redirect from Landing Page -> Admin Dashboard
    if (req.nextUrl.pathname === '/' && role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    // 3. User Login: Redirect from Landing Page -> User Dashboard
    if (req.nextUrl.pathname === '/' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Allow request to proceed if no conditions met
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip static files and Next internals
    '/((?!_next|[^?]*\\.(?:html?|css|js|json|jpg|jpeg|png|gif|svg|woff2?|ttf|ico|txt|xml|webmanifest|map)).*)',
    // Always run for API and app routes
    '/(api|trpc)(.*)',
  ],
}