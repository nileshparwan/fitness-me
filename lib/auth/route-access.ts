import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["user_role"];

type RoleNavContext = {
  role: AppRole;
};

const AUTH_ONLY_PREFIXES = [
  "/dashboard",
  "/coach",
  "/clients",
  "/workouts",
  "/programs",
  "/exercises",
  "/nutrition",
  "/progress",
  "/analytics",
  "/settings",
  "/support",
  "/admin",
] as const;

const USER_PREFIXES = [
  "/dashboard",
  "/coach",
  "/clients",
  "/workouts",
  "/programs",
  "/exercises",
  "/nutrition",
  "/progress",
  "/analytics",
  "/support",
  "/settings",
] as const;

const SYSADMIN_PREFIXES = ["/admin"] as const;

function isPrefixMatch(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hasPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
}

export function getRoleHomePath(context: RoleNavContext | null | undefined) {
  if (!context) return "/dashboard";
  if (context.role === "sysadmin") return "/admin";
  return "/dashboard";
}

export function isProtectedAppPath(pathname: string) {
  return hasPrefix(pathname, AUTH_ONLY_PREFIXES);
}

export function canAccessPathForRole(pathname: string, context: RoleNavContext) {
  if (isPrefixMatch(pathname, "/settings/account")) {
    return true;
  }

  if (context.role === "sysadmin") {
    return hasPrefix(pathname, SYSADMIN_PREFIXES);
  }

  return hasPrefix(pathname, USER_PREFIXES);
}

export type SidebarItemConfig = {
  title: string;
  href: string;
  icon:
    | "home"
    | "dumbbell"
    | "folder"
    | "book"
    | "nutrition"
    | "trend"
    | "support"
    | "target"
    | "user"
    | "shield"
    | "settings"
    | "users"
    | "message"
    | "building"
    | "bell";
  children?: SidebarItemConfig[];
};

export type SidebarSectionConfig = {
  label: string;
  items: SidebarItemConfig[];
};

export function getSidebarSectionsForRole(context: RoleNavContext): SidebarSectionConfig[] {
  if (context.role === "sysadmin") {
    return [
      {
        label: "Admin Console",
        items: [
          {
            title: "Overview",
            href: "/admin",
            icon: "shield",
            children: [
              { title: "Users", href: "/admin/users", icon: "users" },
              { title: "Training", href: "/admin/training", icon: "dumbbell" },
              { title: "Nutrition", href: "/admin/nutrition", icon: "nutrition" },
              { title: "Analytics", href: "/admin/analytics", icon: "trend" },
              { title: "Tickets", href: "/admin/tickets", icon: "support" },
              { title: "Support", href: "/admin/support", icon: "support" },
              { title: "System", href: "/admin/system", icon: "settings" },
              { title: "Settings", href: "/admin/settings", icon: "settings" },
            ],
          },
        ],
      },
    ];
  }

  return [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/dashboard", icon: "home" }],
    },
    {
      label: "Training",
      items: [
        { title: "Workouts", href: "/workouts", icon: "dumbbell" },
        { title: "Programs", href: "/programs", icon: "folder" },
        { title: "Exercises", href: "/exercises", icon: "book" },
      ],
    },
    {
      label: "Coach Tools",
      items: [
        {
          title: "Clients",
          href: "/clients",
          icon: "users",
        },
        {
          title: "Plan Templates",
          href: "/coach/plans",
          icon: "folder",
        },
      ],
    },
    {
      label: "Nutrition",
      items: [
        {
          title: "Diary",
          href: "/nutrition",
          icon: "nutrition",
          children: [
            { title: "Plans", href: "/nutrition/plans", icon: "folder" },
            { title: "Meal Groups", href: "/nutrition/meal-groups", icon: "book" },
          ],
        },
      ],
    },
    {
      label: "Insights",
      items: [
        {
          title: "Progress",
          href: "/progress",
          icon: "trend",
          children: [{ title: "Nutrition Trends", href: "/progress/nutrition", icon: "nutrition" }],
        },
      ],
    },
    {
      label: "Support",
      items: [{ title: "Tickets", href: "/support", icon: "support" }],
    },
    {
      label: "Settings",
      items: [
        { title: "Goals", href: "/settings/goals", icon: "target" },
        { title: "Profile", href: "/settings/profile", icon: "user" },
        { title: "Account", href: "/settings/account", icon: "settings" },
      ],
    },
  ];
}
