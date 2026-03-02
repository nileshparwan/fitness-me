"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/training", label: "Training" },
  { href: "/admin/nutrition", label: "Nutrition" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="native-surface surface-pad">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
              isActive(pathname, link.href)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
