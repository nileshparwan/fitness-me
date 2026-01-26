import { Metadata } from "next";
import Link from "next/link";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils";

export const metadata: Metadata = {
  title: "Register - FitTrack.ai",
};

export default function RegisterPage() {
  return (
    <>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "ghost" }), "absolute right-4 top-4 md:right-8 md:top-8")}
      >
        Login
      </Link>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your email below to create your account</p>
      </div>
      <UserAuthForm type="register" />
    </>
  );
}