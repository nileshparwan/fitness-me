"use client";

import { useState } from "react";
import { Loader2, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { updateProfilePasswordStatus } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { AccountDangerZone } from "@/components/settings/account-danger-zone";

type SecuritySettingsPanelProps = {
  email: string;
  hasEmailIdentity: boolean;
  isAdmin?: boolean;
};

export function SecuritySettingsPanel({ email, hasEmailIdentity, isAdmin = false }: SecuritySettingsPanelProps) {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const resetDialog = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const submitPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (hasEmailIdentity) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (verifyError) throw new Error("Current password is incorrect.");
      }

      const updated = await withToastFeedback(
        (async () => {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (error) throw error;
          await updateProfilePasswordStatus();
          return true;
        })(),
        {
          loading: hasEmailIdentity ? "Updating password..." : "Setting password...",
          success: hasEmailIdentity ? "Password updated." : "Password set.",
          error: "Unable to update password.",
        }
      ).catch(() => null);
      if (!updated) return;

      resetDialog();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch (error) {
      setIsSigningOut(false);
      toast.error(error instanceof Error ? error.message : "Unable to sign out");
    }
  };

  return (
    <div className="stack-gap">
      <section className="native-surface surface-pad stack-gap">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <p className="text-sm text-muted-foreground">
            {hasEmailIdentity
              ? "Update your account password."
              : "Set a password to enable email/password sign in."}
          </p>
        </div>

        {hasEmailIdentity ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value="••••••••" disabled className="bg-muted text-muted-foreground" />
            </div>
            <Button type="button" onClick={() => setOpen(true)}>
              Update
            </Button>
          </div>
        ) : (
          <div className="flex justify-start">
            <Button type="button" onClick={() => setOpen(true)}>
              Set Password
            </Button>
          </div>
        )}
      </section>

      <section className="native-surface surface-pad stack-gap border-destructive/30">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Sign Out</h3>
          <p className="text-sm text-muted-foreground">End your current session on this device.</p>
        </div>
        <div>
          <Button variant="destructive" onClick={() => void signOut()} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Sign Out
          </Button>
        </div>
      </section>

      <AccountDangerZone isAdmin={isAdmin} />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetDialog();
        }}
      >
        <DialogContent size={{ tablet: "sm", desktop: "sm" }}>
          <DialogHeader>
            <DialogTitle>{hasEmailIdentity ? "Update Password" : "Set Password"}</DialogTitle>
            <DialogDescription>
              {hasEmailIdentity
                ? "Enter your current password and choose a new one."
                : "Create a password for email/password sign in."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {hasEmailIdentity ? (
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSavingPassword}>
              Cancel
            </Button>
            <Button onClick={() => void submitPassword()} disabled={isSavingPassword}>
              {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
              {hasEmailIdentity ? "Update Password" : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
