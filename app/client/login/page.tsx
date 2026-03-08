"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientLoginAction } from "@/app/actions/client-portal-auth";
import { useMutation } from "@tanstack/react-query";

export default function ClientLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: clientLoginAction,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Client Portal Login</CardTitle>
          <CardDescription>
            Sign in with your coach-provided username and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={loginMutation.isPending}
            onClick={() =>
              void loginMutation
                .mutateAsync({
                  username: username.trim(),
                  password,
                })
                .then(() => {
                  toast.success("Welcome back.");
                  router.replace("/client");
                })
                .catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Login failed");
                })
            }
          >
            {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Looking for the main app?{" "}
            <Link className="underline underline-offset-4" href="/login">
              Go to user login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

