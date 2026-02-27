"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SetPasswordCardProps = {
  isSocialOnly: boolean;
};

export function SetPasswordCard({ isSocialOnly }: SetPasswordCardProps) {
  const supabase = createClient();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

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

      const { error } = await supabase.auth.updateUser({ password, data: metadata });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      toast.success("Password set successfully. You can now sign in using email and password.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to set password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="native-surface surface-pad stack-gap">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Set Password</h3>
        <p className="text-sm text-muted-foreground">
          {isSocialOnly
            ? "Your account uses social login. Set a password to enable standard email/password sign in."
            : "Update your password for standard sign in."}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
        <Button disabled={isLoading} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save password
        </Button>
      </form>
    </div>
  );
}
