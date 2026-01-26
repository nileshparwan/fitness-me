import { Metadata } from "next";
import Link from "next/link";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils";

export const metadata: Metadata = {
  title: "Login - FitTrack.ai",
};

export default function LoginPage() {
  return (
    <>
      <Link
        href="/register"
        className={cn(buttonVariants({ variant: "ghost" }), "absolute right-4 top-4 md:right-8 md:top-8")}
      >
        Register
      </Link>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard</p>
      </div>
      <UserAuthForm type="login" />
    </>
  );
}