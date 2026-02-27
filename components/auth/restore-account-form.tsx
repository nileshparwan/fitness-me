"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { restoreCurrentSoftDeletedAccount, restoreSoftDeletedAccount } from "@/app/actions/account-security";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RestoreValues = z.infer<typeof loginSchema>;

export function RestoreAccountForm() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionDeleted, setSessionDeleted] = React.useState(false);
  const router = useRouter();
  const form = useForm<RestoreValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RestoreValues) {
    setIsLoading(true);
    try {
      await restoreSoftDeletedAccount(values.email, values.password);
      toast.success("Account restored successfully");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const isDeleted = Boolean(data.user?.user_metadata?.is_deleted);
      setSessionDeleted(isDeleted);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function onRestoreCurrentSession() {
    setIsLoading(true);
    try {
      await restoreCurrentSoftDeletedAccount();
      toast.success("Account restored successfully");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
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
      {sessionDeleted && (
        <div className="native-surface surface-pad grid gap-3">
          <p className="text-sm text-muted-foreground">
            Your deleted account is already authenticated. You can restore it immediately.
          </p>
          <Button type="button" onClick={onRestoreCurrentSession} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore current account
          </Button>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} disabled={isLoading} />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
            disabled={isLoading}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>

        <Button disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Restore account
        </Button>
      </form>

      <div className="native-surface surface-pad grid gap-3">
        <p className="text-sm text-muted-foreground">
          Signed up with Google? Continue with Google, then restore your account.
        </p>
        <Button type="button" variant="outline" onClick={continueWithGoogle} disabled={isLoading}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
