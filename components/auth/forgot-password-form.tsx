"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { requestPasswordReset } from "@/app/actions/account-security";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [showSocialRecovery, setShowSocialRecovery] = React.useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordValues) {
    setIsLoading(true);
    try {
      await requestPasswordReset(data.email);
      setSubmitted(true);
      setShowSocialRecovery(false);
      toast.success("If this email exists, a reset link has been sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message);
      setShowSocialRecovery(message.toLowerCase().includes("social login"));
    } finally {
      setIsLoading(false);
    }
  }

  async function continueWithGoogle() {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/restore-account`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign in failed");
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            disabled={isLoading}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      {submitted && (
        <p className="text-sm text-muted-foreground">
          Check your inbox and spam folder for the reset email.
        </p>
      )}

      {showSocialRecovery && (
        <div className="native-surface surface-pad grid gap-3">
          <p className="text-sm text-muted-foreground">
            This account does not have password login enabled yet. Continue with your provider to regain access, then set a password in Account Settings.
          </p>
          <Button type="button" variant="outline" onClick={continueWithGoogle} disabled={isLoading}>
            Continue with Google
          </Button>
        </div>
      )}
    </div>
  );
}
