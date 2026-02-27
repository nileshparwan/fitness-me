"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { createDeleteAccountChallenge, requestSoftDeleteAccount } from "@/app/actions/account-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CONFIRM_WORD = "DELETE";

type AccountDangerZoneProps = {
  isAdmin?: boolean;
};

export function AccountDangerZone({ isAdmin = false }: AccountDangerZoneProps) {
  const [reason, setReason] = React.useState("");
  const [confirmWord, setConfirmWord] = React.useState("");
  const [challengePrompt, setChallengePrompt] = React.useState("");
  const [challengeToken, setChallengeToken] = React.useState("");
  const [challengeResponse, setChallengeResponse] = React.useState("");
  const [loadingChallenge, setLoadingChallenge] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const canSubmit =
    !isAdmin &&
    checked &&
    confirmWord.trim().toUpperCase() === CONFIRM_WORD &&
    challengeResponse.trim().length > 0 &&
    challengeToken.length > 0 &&
    !submitting;

  const loadChallenge = React.useCallback(async () => {
    if (isAdmin) return;
    setLoadingChallenge(true);
    try {
      const challenge = await createDeleteAccountChallenge();
      setChallengePrompt(challenge.prompt);
      setChallengeToken(challenge.token);
      setChallengeResponse("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load verification challenge");
    } finally {
      setLoadingChallenge(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    if (!open || isAdmin) return;
    void loadChallenge();
  }, [open, isAdmin, loadChallenge]);

  async function onConfirmDelete() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await requestSoftDeleteAccount(challengeToken, challengeResponse, reason);
      toast.success(
        `Account deactivated. You can restore it before ${new Date(result.recoverableUntil).toLocaleDateString()}.`
      );
      setOpen(false);
      window.location.assign("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to deactivate account";
      toast.error(message);
      if (message.toLowerCase().includes("challenge verification failed")) {
        await loadChallenge();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="native-surface surface-pad stack-gap border-red-200">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-red-100 p-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-700">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Admin accounts cannot be self-deactivated."
              : "Deactivate your account (soft delete). Your data remains recoverable for 30 days."}
          </p>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isAdmin}>
            Deactivate account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out immediately. You can restore your account within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="delete-challenge">Identity challenge</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={loadChallenge} disabled={loadingChallenge}>
                  {loadingChallenge ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{challengePrompt || "Loading challenge..."}</p>
              <Input
                id="delete-challenge"
                value={challengeResponse}
                onChange={(e) => setChallengeResponse(e.target.value)}
                placeholder="Enter answer"
                disabled={loadingChallenge}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delete-reason">Reason (optional)</Label>
              <Textarea
                id="delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you are leaving."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              I understand this will deactivate my account.
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canSubmit} onClick={onConfirmDelete}>
              {submitting ? "Deactivating..." : "Confirm deactivation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
