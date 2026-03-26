import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessPathForRole, getRoleHomePath, isProtectedAppPath } from "@/lib/auth/route-access";
import { rateLimit } from "@/lib/rate-limit";

const redirectMap: Record<string, string> = {
  "/signin": "/login",
  "/sign-in": "/login",
  "/signup": "/register",
  "/sign-up": "/register",
};


export async function updateSession(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const pathname = request.nextUrl.pathname.toLowerCase();
  const method = request.method.toUpperCase();
  const isAuthRoute =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/client-portal/login") ||
    pathname === "/login" ||
    pathname === "/register";
  const isApiRoute = pathname.startsWith("/api/");
  const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";
  const shouldRateLimit = isAuthRoute || isApiRoute || !isSafeMethod;

  // Skip throttling for normal page GET/HEAD requests (including React Server Component fetches)
  // to avoid false 429s during navigation, prefetch, and local HMR refresh cycles.
  if (shouldRateLimit) {
    const limit = isAuthRoute ? 10 : 60;
    const windowMs = 60_000;
    const key = isAuthRoute ? `auth:${ip}` : `${isApiRoute ? "api" : "mutation"}:${ip}:${pathname}`;
    const { success } = rateLimit(key, limit, windowMs);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

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
  const providers = Array.isArray(user?.app_metadata?.providers)
    ? (user?.app_metadata?.providers as unknown[])
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.toLowerCase())
    : []
  const isSocialOnly = providers.length > 0 && !providers.includes("email")
  const profile = user
    ? await (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("role, is_deleted, is_blocked, has_password")
          .eq("id", user.id)
          .maybeSingle()
        return data ?? null
      })()
    : null
  const isDeleted = Boolean(profile?.is_deleted)
  const isBlocked = Boolean(profile?.is_blocked)
  const hasPassword = Boolean(profile?.has_password)
  const profileRole = typeof profile?.role === "string" ? profile.role.toLowerCase() : null
  const appRole =
    typeof user?.app_metadata?.role === "string" ? String(user.app_metadata.role).toLowerCase() : null
  const userRole =
    typeof user?.user_metadata?.role === "string" ? String(user.user_metadata.role).toLowerCase() : null
  const resolvedRole = profileRole || appRole || userRole || "user"
  const normalizedRole: "sysadmin" | "user" =
    resolvedRole === "admin" || resolvedRole === "sysadmin"
      ? "sysadmin"
      : "user"

  const roleContext = {
    role: normalizedRole,
  } as const

  // ---------------------------------------------------------
  // 3.6 NEW: Handle Root Path (localhost:3000 -> /)
  // ---------------------------------------------------------
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (user) {
      url.pathname = getRoleHomePath(roleContext)
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
  const isProtected = isProtectedAppPath(request.nextUrl.pathname);

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url) // ⛔️ Stop! Go to login.
  }

  // Blocked users can only reach auth/recovery endpoints.
  if (user && isBlocked) {
    const allowedBlockedPaths = ['/login', '/forgot-password', '/reset-password', '/api/auth/callback'];
    const isAllowed = allowedBlockedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
    if (!isAllowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Soft-deleted users can only access restore/auth paths until account is restored.
  if (user && isDeleted && !isBlocked) {
    const allowedDeletedPaths = ['/restore-account', '/login', '/forgot-password', '/reset-password', '/api/auth/callback'];
    const isAllowed = allowedDeletedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
    if (!isAllowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/restore-account'
      return NextResponse.redirect(url)
    }
  }

  if (user && !isDeleted && request.nextUrl.pathname === '/restore-account') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Social-only accounts must set a password before accessing the app.
  if (user && !isDeleted && !isBlocked && isSocialOnly && !hasPassword) {
    const allowedPasswordSetupPaths = ['/settings/security', '/api/auth/callback'];
    const isAllowed = allowedPasswordSetupPaths.some((path) => request.nextUrl.pathname.startsWith(path));
    if (!isAllowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/settings/security'
      return NextResponse.redirect(url)
    }
  }

  // Role-route ownership guard for all protected app routes.
  if (user && isProtected) {
    const allowed = canAccessPathForRole(request.nextUrl.pathname, roleContext);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(roleContext);
      return NextResponse.redirect(url);
    }
  }

  // Also redirect logged-in users away from login page
  if (user && !isDeleted && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = getRoleHomePath(roleContext)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
