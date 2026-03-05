"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useRole, AppRole } from "@/hooks/use-role";
import { getRoleHomePath } from "@/lib/auth/route-access";

type RoleGuardProps = {
  required: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGuard({ required, children, fallback = null }: RoleGuardProps) {
  const { data: roleContext, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && roleContext && !required.includes(roleContext.role)) {
      router.replace(getRoleHomePath(roleContext));
    }
  }, [isLoading, required, roleContext, router]);

  if (isLoading) return null;
  if (!roleContext) return <>{fallback}</>;
  if (!required.includes(roleContext.role)) return null;

  return <>{children}</>;
}
