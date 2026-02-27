"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  React.useEffect(() => {
    let active = true;

    const resolveRecoveryState = async () => {
      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);
      const errorCode = hashParams.get("error_code");
      const errorDescription = hashParams.get("error_description");

      if (errorCode === "otp_expired") {
        if (!active) return;
        setSessionError("This reset link has expired. Request a new password reset email.");
        setSessionReady(false);
        setCheckingSession(false);
        return;
      }

      if (errorCode) {
        if (!active) return;
        setSessionError(errorDescription || "This reset link is invalid. Request a new one.");
        setSessionReady(false);
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        setSessionReady(true);
        setSessionError(null);
      } else {
        setSessionReady(false);
        setSessionError("Auth session is missing. Open the latest reset link from your email.");
      }
      setCheckingSession(false);
    };

    void resolveRecoveryState();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        setSessionReady(true);
        setSessionError(null);
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSubmit(data: ResetPasswordValues) {
    if (!sessionReady) {
      toast.error(sessionError || "Reset session not found. Request a new reset link.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      toast.success("Password updated successfully");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      {checkingSession && <div className="text-sm text-muted-foreground">Validating reset link...</div>}

      {sessionError && !checkingSession && (
        <div className="native-surface surface-pad grid gap-3">
          <p className="text-sm text-red-600">{sessionError}</p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new reset link
          </Link>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading || checkingSession || !sessionReady}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading || checkingSession || !sessionReady}
            {...form.register("confirm_password")}
          />
          {form.formState.errors.confirm_password && (
            <p className="text-sm text-red-500">{form.formState.errors.confirm_password.message}</p>
          )}
        </div>

        <Button disabled={isLoading || checkingSession || !sessionReady}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
