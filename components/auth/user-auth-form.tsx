"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { checkAuthUserExistsAction } from "@/app/actions/auth";
import { checkProfileDeletedStatus } from "@/app/actions/settings";

import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Import schemata
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import * as z from "zod";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "login" | "register";
}

const authFormSchema = loginSchema.extend({
  username: z.string().optional(),
});
type FormData = z.infer<typeof authFormSchema>;

export function UserAuthForm({ className, type, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const router = useRouter();
  const supabase = createClient();

  // 2. Initialize form with superset schema; mode-specific validation is done in onSubmit.
  const form = useForm<FormData>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const emailParam = new URLSearchParams(window.location.search).get("email") ?? "";
    if (!emailParam) return;
    form.setValue("email", emailParam, { shouldDirty: false });
  }, [form]);

  // 4. Submit Handler
  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      if (type === "register") {
        const parsed = registerSchema.parse(data);
        const username = parsed.username.trim() || parsed.email.split("@")[0];

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            data: {
              display_name: username,
              full_name: username,
              role: "user",
              has_password: true,
              password_configured_at: new Date().toISOString(),
            },
            emailRedirectTo: `${window.location.origin}/api/auth/callback?intent=register&next=/settings/security`,
          },
        });

        if (error) throw error;

        // If email confirmation is enabled, there may be no active session yet.
        if (!signUpData.session) {
          toast.success("Registration successful. Verify your email, then continue to account security.");
          router.push("/login");
          return;
        }

        toast.success("Registration successful. Continue to account security.");
        router.push("/settings/security");
        router.refresh();
      } else {
        const parsed = loginSchema.parse(data);
        const normalizedEmail = parsed.email.trim().toLowerCase();

        const existence = await checkAuthUserExistsAction(normalizedEmail);
        if (!existence.exists) {
          toast.info("No account found for this email. Redirecting you to registration.");
          router.push(`/register?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: parsed.password,
        });

        if (error) throw error;

        const { is_deleted: isDeleted, is_blocked: isBlocked } = await checkProfileDeletedStatus();
        if (isBlocked) {
          await supabase.auth.signOut();
          toast.error("Your account is blocked. Contact support.");
          router.push("/login");
          return;
        }
        if (isDeleted) {
          await supabase.auth.signOut();
          toast.error("This account is deactivated. Restore it to continue.");
          router.push("/restore-account");
          return;
        }

        toast.success("Welcome back!");
        router.refresh();
        router.push("/dashboard");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard&intent=${type}`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error("Google sign in failed");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          
          {type === "register" && (
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="IronLifter99"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                disabled={isLoading}
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              autoComplete={type === "login" ? "current-password" : "new-password"}
              disabled={isLoading}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
            {type === "register" && (
              <p className="text-xs text-muted-foreground">
                Use a strong password to protect your training history, health data, and account recovery access.
              </p>
            )}
            {type === "login" && (
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          <Button disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "login" ? "Sign In" : "Create Account"}
          </Button>

          {type === "login" ? (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                const attemptedEmail = form.getValues("email")?.trim();
                router.push(
                  attemptedEmail
                    ? `/register?email=${encodeURIComponent(attemptedEmail)}`
                    : "/register"
                );
              }}
            >
              I&apos;m New, Register
            </Button>
          ) : null}
        </div>
      </form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      
      <Button variant="outline" type="button" disabled={isLoading} onClick={onGoogleSignIn}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
        )}
        Google
      </Button>
    </div>
  );
}
