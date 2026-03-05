import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

function isLikelyFirstOAuthSignIn(user: { created_at?: string | null; last_sign_in_at?: string | null }) {
  if (!user.created_at || !user.last_sign_in_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  const lastSignInAt = new Date(user.last_sign_in_at).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignInAt)) return false;
  return Math.abs(lastSignInAt - createdAt) <= 120000;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const intent = searchParams.get("intent")
  const authError = searchParams.get("error")
  const authErrorDescription = searchParams.get("error_description")
  
  // 1. Change the default fallback from '/' to '/dashboard'
  let next = searchParams.get('next') ?? '/dashboard'

  if (!next.startsWith('/')) {
    next = '/dashboard' // Ensure fallback is secure here too
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const redirectToPath = (path: string) => {
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${path}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${path}`)
    } else {
      return NextResponse.redirect(`${origin}${path}`)
    }
  }

  if (authError) {
    const safeMessage = encodeURIComponent(
      authErrorDescription ? authErrorDescription.replace(/\+/g, " ") : "Could not authenticate user"
    );
    if (intent === "login" || intent === "register") {
      return redirectToPath(`/register?error=${safeMessage}`);
    }
    return redirectToPath(`/login?error=${safeMessage}`);
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (intent === "login" && isLikelyFirstOAuthSignIn(user)) {
          await supabase.auth.signOut();
          const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
          return redirectToPath(`/register${emailParam}`);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        let inferredRole: "user" | "sysadmin" =
          typeof user.app_metadata?.role === "string" &&
          (user.app_metadata.role === "sysadmin" || user.app_metadata.role === "admin")
            ? "sysadmin"
            : "user";

        if (!profile) {
          if (intent === "login") {
            await supabase.auth.signOut();
            const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
            return redirectToPath(`/register${emailParam}`);
          }

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              role: inferredRole,
              full_name:
                typeof user.user_metadata?.full_name === "string"
                  ? user.user_metadata.full_name
                  : typeof user.user_metadata?.display_name === "string"
                    ? user.user_metadata.display_name
                    : null,
            },
            { onConflict: "id" }
          );
        } else if (profile.role === "sysadmin" || profile.role === "user") {
          inferredRole = profile.role;
        }

        if (intent === "register") {
          const currentMetadata =
            user.user_metadata && typeof user.user_metadata === "object"
              ? (user.user_metadata as Record<string, unknown>)
              : {};

          await supabase.auth.updateUser({
            data: {
              ...currentMetadata,
              role: inferredRole === "sysadmin" ? "user" : inferredRole,
            },
          });
        }
      }

      return redirectToPath(next)
    }
  }

  // If error, redirect to login
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
