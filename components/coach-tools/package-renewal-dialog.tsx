"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { ClientBillingPlanWithRemaining, PaymentMethod } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCoachToolMutations } from "@/hooks/use-coach-tools";

type PackageRenewalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ClientBillingPlanWithRemaining;
  clientName?: string;
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PackageRenewalDialog({ open, onOpenChange, plan, clientName }: PackageRenewalDialogProps) {
  const mutations = useCoachToolMutations();
  const baseSessions = Math.max(1, Number(plan.sessions_purchased || 0) || 10);
  const [sessionsToAdd, setSessionsToAdd] = useState(String(baseSessions));
  const [paymentAmount, setPaymentAmount] = useState(String(Number(plan.session_rate || 0) * baseSessions));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((plan.payment_method || "cash") as PaymentMethod);
  const [notes, setNotes] = useState("Package renewal");

  useEffect(() => {
    if (!open) return;
    setSessionsToAdd(String(baseSessions));
    setPaymentAmount(String(Number(plan.session_rate || 0) * baseSessions));
    setPaymentMethod((plan.payment_method || "cash") as PaymentMethod);
    setNotes("Package renewal");
  }, [baseSessions, open, plan.payment_method, plan.session_rate]);

  const isSaving = mutations.renewPackage.isPending;

  const helper = useMemo(() => {
    if (!clientName) return "Add more sessions and record the package payment.";
    return `Renew ${clientName}'s package and log the advance payment.`;
  }, [clientName]);

  const submit = async () => {
    const parsedSessions = toNumber(sessionsToAdd);
    if (!parsedSessions || parsedSessions <= 0) {
      toast.error("Sessions to add must be greater than 0.");
      return;
    }

    const parsedAmount = toNumber(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Payment amount must be greater than 0.");
      return;
    }

    try {
      await mutations.renewPackage.mutateAsync({
        billing_plan_id: plan.id,
        sessions_to_add: Math.trunc(parsedSessions),
        payment_amount: parsedAmount,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });
      toast.success("Package renewed");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to renew package");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Renew Package</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Sessions to Add</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={sessionsToAdd}
              onChange={(event) => setSessionsToAdd(event.target.value)}
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 rounded-xl border-border/60 bg-muted/20"
              placeholder="Package renewal"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="accent-strong rounded-xl text-black" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
