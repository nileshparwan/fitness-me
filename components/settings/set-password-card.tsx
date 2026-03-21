"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

type SetPasswordCardProps = {
  isSocialOnly: boolean;
};

export function SetPasswordCard({ isSocialOnly }: SetPasswordCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const metadata = {
        ...(user?.user_metadata || {}),
        has_password: true,
        password_configured_at: new Date().toISOString(),
      };

      const updated = await withToastFeedback(
        (async () => {
          const { error } = await supabase.auth.updateUser({ password, data: metadata });
          if (error) throw error;
          return true;
        })(),
        {
          loading: "Setting password...",
          success: "Password set successfully. You can now sign in using email and password.",
          error: "Unable to set password",
        }
      ).catch(() => null);
      if (!updated) return;

      setPassword("");
      setConfirmPassword("");
      await wait(2400);
      toast.message("Signing out for security. Please log in again.");
      setIsSigningOut(true);

      await wait(1100);
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to set password");
      setIsSigningOut(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isSigningOut ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing out securely...</span>
          </div>
        </div>
      ) : null}

      <div className="native-surface surface-pad stack-gap">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Set Password</h3>
        <p className="text-sm text-muted-foreground">
          {isSocialOnly
            ? "Your account uses social login. Set a password to enable standard email/password sign in."
            : "Update your password for standard sign in."}
        </p>
        <p className="text-xs text-amber-700">
          A password is important for account recovery and protects access if your social provider is unavailable.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading || isSigningOut}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-new-password">Confirm new password</Label>
          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isLoading || isSigningOut}
          />
        </div>
        <Button disabled={isLoading || isSigningOut} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save password
        </Button>
      </form>
      </div>
    </>
  );
}
