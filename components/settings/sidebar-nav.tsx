"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { buttonVariants } from "@/components/ui/button";
import { User, Target, ShieldAlert } from "lucide-react"; // Make sure you have lucide-react installed

const sidebarNavItems = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: <User className="mr-2 h-4 w-4" />,
  },
  {
    title: "Fitness Goals",
    href: "/settings/goals",
    icon: <Target className="mr-2 h-4 w-4" />,
  },
  {
    title: "Account",
    href: "/settings/account",
    icon: <ShieldAlert className="mr-2 h-4 w-4" />,
  },
];

export function SidebarNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)} {...props}>
      {sidebarNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
