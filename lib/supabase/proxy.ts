import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const redirectMap: Record<string, string> = {
  "/signin": "/login",
  "/sign-in": "/login",
  "/signup": "/register",
  "/sign-up": "/register",
};


export async function updateSession(request: NextRequest) {
  // 1. Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Setup Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // 3. Refresh Session
  // This will call 'setAll' above if the token needs refreshing
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname.toLowerCase()

  // ---------------------------------------------------------
  // 3.6 NEW: Handle Root Path (localhost:3000 -> /)
  // ---------------------------------------------------------
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (user) {
      url.pathname = '/dashboard' // User is logged in -> Dashboard
    } else {
      url.pathname = '/login'     // User is guest -> Login
    }
    return NextResponse.redirect(url)
  }

  // 3.5 Handle static redirects for signin/signup
  if (redirectMap[pathname]) {
    const url = request.nextUrl.clone()
    url.pathname = redirectMap[pathname]
    return NextResponse.redirect(url)
  }

  // 4. Protect Routes
  // This array contains all the paths you want to secure
  const protectedPaths = ['/dashboard', '/workouts', '/exercises', '/progress', '/settings', '/programs'];

  // Check if the current path starts with any of the protected paths
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url) // ⛔️ Stop! Go to login.
  }

  // Also redirect logged-in users away from login page
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}