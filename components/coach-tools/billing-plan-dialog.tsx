"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { BillingType, ClientBillingPlanWithRemaining, PaymentMethod } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCoachToolMutations } from "@/hooks/use-coach-tools";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

type BillingPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
  existingPlan?: ClientBillingPlanWithRemaining | null;
  mode?: "create" | "edit";
};

const BILLING_TYPE_OPTIONS: Array<{ value: BillingType; label: string }> = [
  { value: "per_session", label: "Per Session" },
  { value: "session_package", label: "Session Package" },
  { value: "monthly", label: "Monthly" },
  { value: "program", label: "Program" },
  { value: "hourly", label: "Hourly" },
];

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultForm(plan?: ClientBillingPlanWithRemaining | null) {
  return {
    billingType: plan?.billing_type ?? ("per_session" as BillingType),
    sessionRate: String(plan ? Number(plan.session_rate || 0) : 50),
    currency: (plan?.currency || "USD").toUpperCase(),
    paymentMethod: (plan?.payment_method || "cash") as PaymentMethod,
    sessionsPurchased: String(plan?.sessions_purchased ?? 0),
    monthlyAmount: plan?.monthly_amount !== null && plan?.monthly_amount !== undefined ? String(Number(plan.monthly_amount)) : "",
    billingCycleDay: plan?.billing_cycle_day ? String(plan.billing_cycle_day) : "",
    programStartDate: plan?.program_start_date ?? "",
    programEndDate: plan?.program_end_date ?? "",
    notes: plan?.notes || "",
  };
}

export function BillingPlanDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  existingPlan = null,
  mode,
}: BillingPlanDialogProps) {
  const mutations = useCoachToolMutations();
  const resolvedMode = mode ?? (existingPlan ? "edit" : "create");

  const [billingType, setBillingType] = useState<BillingType>("per_session");
  const [sessionRate, setSessionRate] = useState("50");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [sessionsPurchased, setSessionsPurchased] = useState("0");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [billingCycleDay, setBillingCycleDay] = useState("");
  const [programStartDate, setProgramStartDate] = useState("");
  const [programEndDate, setProgramEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const form = defaultForm(existingPlan);
    setBillingType(form.billingType);
    setSessionRate(form.sessionRate);
    setCurrency(form.currency);
    setPaymentMethod(form.paymentMethod);
    setSessionsPurchased(form.sessionsPurchased);
    setMonthlyAmount(form.monthlyAmount);
    setBillingCycleDay(form.billingCycleDay);
    setProgramStartDate(form.programStartDate);
    setProgramEndDate(form.programEndDate);
    setNotes(form.notes);
  }, [existingPlan, open]);

  const isSaving =
    mutations.createBillingPlan.isPending || mutations.updateBillingPlan.isPending;
  const waitingForExistingPlan = resolvedMode === "edit" && !existingPlan;

  const isPackageLike = billingType === "session_package" || billingType === "program";
  const isMonthly = billingType === "monthly";
  const isProgram = billingType === "program";

  const title = resolvedMode === "edit" ? "Edit Billing Plan" : "Set Up Billing Plan";
  const description = useMemo(() => {
    if (clientName) {
      return `${clientName} billing configuration and session logging behavior.`;
    }
    return "Configure billing behavior for this client.";
  }, [clientName]);

  const submit = async () => {
    if (waitingForExistingPlan) {
      toast.error("Loading current billing plan. Try again in a moment.");
      return;
    }

    const parsedSessionRate = toNumber(sessionRate);
    if (!parsedSessionRate || parsedSessionRate <= 0) {
      toast.error("Session rate must be greater than 0.");
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (normalizedCurrency.length < 3 || normalizedCurrency.length > 8) {
      toast.error("Currency must be between 3 and 8 characters.");
      return;
    }

    const parsedSessionsPurchased = toNumber(sessionsPurchased) ?? 0;
    if ((billingType === "session_package" || billingType === "program") && parsedSessionsPurchased <= 0) {
      toast.error("Sessions purchased must be greater than 0 for package/program billing.");
      return;
    }

    const parsedMonthlyAmount = toNumber(monthlyAmount);
    const parsedCycleDay = toNumber(billingCycleDay);
    if (billingType === "monthly") {
      if (!parsedMonthlyAmount || parsedMonthlyAmount <= 0) {
        toast.error("Monthly amount is required for monthly billing.");
        return;
      }
      if (!parsedCycleDay || parsedCycleDay < 1 || parsedCycleDay > 28) {
        toast.error("Billing cycle day must be between 1 and 28.");
        return;
      }
    }

    if (billingType === "program" && programStartDate && programEndDate && programEndDate <= programStartDate) {
      toast.error("Program end date must be after program start date.");
      return;
    }

    const replacingPlan =
      Boolean(existingPlan) &&
      (existingPlan?.billing_type !== billingType || existingPlan?.currency !== normalizedCurrency);

    if (resolvedMode === "edit" && existingPlan && !replacingPlan) {
      const result = await withToastFeedback(
        mutations.updateBillingPlan.mutateAsync({
          id: existingPlan.id,
          session_rate: parsedSessionRate,
          sessions_purchased: isPackageLike ? Math.trunc(parsedSessionsPurchased) : existingPlan.sessions_purchased,
          monthly_amount: isMonthly ? parsedMonthlyAmount : null,
          billing_cycle_day: isMonthly ? Math.trunc(parsedCycleDay || 1) : null,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          is_active: true,
        }),
        {
          loading: "Updating billing plan...",
          success: "Billing plan saved",
          error: "Unable to save billing plan",
        }
      ).catch(() => null);
      if (!result) return;
      onOpenChange(false);
      return;
    }

    if (existingPlan?.is_active) {
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm("This will deactivate the current active plan and create a new one. Continue?");
      if (!confirmed) return;
    }
    const created = await withToastFeedback(
      mutations.createBillingPlan.mutateAsync({
        client_id: clientId,
        billing_type: billingType,
        session_rate: parsedSessionRate,
        currency: normalizedCurrency,
        payment_method: paymentMethod,
        sessions_purchased: isPackageLike ? Math.trunc(parsedSessionsPurchased) : 0,
        monthly_amount: isMonthly ? parsedMonthlyAmount : null,
        billing_cycle_day: isMonthly ? Math.trunc(parsedCycleDay || 1) : null,
        program_start_date: isProgram ? (programStartDate || null) : null,
        program_end_date: isProgram ? (programEndDate || null) : null,
        notes: notes.trim() || null,
      }),
      {
        loading: "Creating billing plan...",
        success: "Billing plan saved",
        error: "Unable to save billing plan",
      }
    ).catch(() => null);
    if (!created) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {waitingForExistingPlan ? (
          <div className="rounded-xl border border-border/60 bg-background/35 px-3 py-4 text-sm text-muted-foreground">
            Loading existing plan details...
          </div>
        ) : (
          <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Type</Label>
              <Select value={billingType} onValueChange={(value) => setBillingType(value as BillingType)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Session Rate</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sessionRate}
                onChange={(event) => setSessionRate(event.target.value)}
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={currency}
                maxLength={8}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          </div>

          {isPackageLike ? (
            <div className="space-y-2">
              <Label>Sessions Purchased</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={sessionsPurchased}
                onChange={(event) => setSessionsPurchased(event.target.value)}
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          ) : null}

          {isMonthly ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Monthly Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(event) => setMonthlyAmount(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle Day</Label>
                <Select value={billingCycleDay || undefined} onValueChange={setBillingCycleDay}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }).map((_, index) => {
                      const day = String(index + 1);
                      return (
                        <SelectItem key={day} value={day}>
                          Day {day}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {isProgram ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Program Start Date</Label>
                <Input
                  type="date"
                  value={programStartDate}
                  onChange={(event) => setProgramStartDate(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Program End Date</Label>
                <Input
                  type="date"
                  value={programEndDate}
                  onChange={(event) => setProgramEndDate(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 rounded-xl border-border/60 bg-muted/20"
              placeholder="Add billing context..."
            />
          </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="accent-strong rounded-xl text-black" onClick={() => void submit()} disabled={isSaving || waitingForExistingPlan}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
