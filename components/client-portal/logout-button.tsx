"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useClientPortalMutations } from "@/hooks/use-client-portal";

type ClientPortalLogoutButtonProps = {
  className?: string;
};

export function ClientPortalLogoutButton({ className }: ClientPortalLogoutButtonProps) {
  const router = useRouter();
  const { clientLogout } = useClientPortalMutations(new Date().toISOString().slice(0, 10));

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() =>
        void clientLogout
          .mutateAsync()
          .then(() => {
            router.replace("/client/login");
          })
          .catch((error) => {
            toast.error(error instanceof Error ? error.message : "Unable to logout");
          })
      }
      disabled={clientLogout.isPending}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}

