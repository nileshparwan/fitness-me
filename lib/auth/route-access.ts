import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["user_role"];

export type RoleNavContext = {
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
  "/supplements",
  "/progress",
  "/goals",
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
  "/supplements",
  "/progress",
  "/goals",
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
  if (isPrefixMatch(pathname, "/settings/security")) {
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
    | "bell"
    | "pill";
  children?: SidebarItemConfig[];
};

type SidebarSectionConfig = {
  label: string;
  items: SidebarItemConfig[];
};

const USER_WORKSPACE_SECTIONS: SidebarSectionConfig[] = [
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
      { title: "Dashboard", href: "/clients/dashboard", icon: "home" },
      { title: "Clients", href: "/clients", icon: "users" },
      { title: "Payments", href: "/clients/payments", icon: "book" },
    ],
  },
  {
    label: "Nutrition",
    items: [
      { title: "Dashboard", href: "/nutrition/dashboard", icon: "home" },
      { title: "Meal Diary", href: "/nutrition/diary", icon: "book" },
      { title: "Meal Planner", href: "/nutrition/meal-planner", icon: "nutrition" },
      { title: "Meal Groups", href: "/nutrition/meal-groups", icon: "book" },
    ],
  },
  {
    label: "Supplements",
    items: [
      { title: "Catalog", href: "/supplements", icon: "pill" },
      { title: "Assigned", href: "/supplements/assigned", icon: "pill" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Progress", href: "/progress", icon: "trend" },
      { title: "Nutrition", href: "/progress/nutrition", icon: "nutrition" },
    ],
  },
  {
    label: "Support",
    items: [{ title: "Tickets", href: "/support", icon: "support" }],
  },
  {
    label: "Settings",
    items: [{ title: "Goals", href: "/goals", icon: "target" }],
  },
];

const SYSADMIN_SECTIONS: SidebarSectionConfig[] = [
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
          { title: "System", href: "/admin/system", icon: "settings" },
          { title: "Settings", href: "/admin/settings", icon: "settings" },
        ],
      },
    ],
  },
];

export type MobileNavTabConfig = {
  key: string;
  label: string;
  href?: string;
  icon: "home" | "dumbbell" | "folder" | "book" | "nutrition" | "trend" | "users" | "target" | "menu";
  action?: "menu";
};

const MOBILE_MENU_TAB: MobileNavTabConfig = {
  key: "menu",
  label: "Menu",
  icon: "menu",
  action: "menu",
};

const MOBILE_TABS_DEFAULT: MobileNavTabConfig[] = [
  { key: "dashboard", label: "Home", href: "/dashboard", icon: "home" },
  { key: "progress", label: "Progress", href: "/progress", icon: "trend" },
  { key: "tickets", label: "Tickets", href: "/support", icon: "book" },
  { key: "goals", label: "Goals", href: "/goals", icon: "target" },
  MOBILE_MENU_TAB,
];

const MOBILE_TABS_TRAINING: MobileNavTabConfig[] = [
  { key: "workouts", label: "Workouts", href: "/workouts", icon: "dumbbell" },
  { key: "programs", label: "Programs", href: "/programs", icon: "folder" },
  { key: "exercises", label: "Exercises", href: "/exercises", icon: "book" },
  MOBILE_MENU_TAB,
];

const MOBILE_TABS_COACH_TOOLS: MobileNavTabConfig[] = [
  { key: "clients-dashboard", label: "Dashboard", href: "/clients/dashboard", icon: "home" },
  { key: "clients-roster", label: "Clients", href: "/clients", icon: "users" },
  { key: "clients-payments", label: "Payments", href: "/clients/payments", icon: "book" },
  MOBILE_MENU_TAB,
];

const MOBILE_TABS_NUTRITION: MobileNavTabConfig[] = [
  { key: "nutrition-dashboard", label: "Dashboard", href: "/nutrition/dashboard", icon: "home" },
  { key: "nutrition-diary", label: "Diary", href: "/nutrition/diary", icon: "book" },
  { key: "nutrition-planner", label: "Planner", href: "/nutrition/meal-planner", icon: "nutrition" },
  { key: "nutrition-groups", label: "Groups", href: "/nutrition/meal-groups", icon: "folder" },
  MOBILE_MENU_TAB,
];

function isTrainingPath(pathname: string) {
  return isPrefixMatch(pathname, "/workouts") || isPrefixMatch(pathname, "/programs") || isPrefixMatch(pathname, "/exercises");
}

function isCoachToolsPath(pathname: string) {
  // Includes coach tools hubs and nested routes like /clients/:clientId/payments.
  return isPrefixMatch(pathname, "/clients");
}

function isNutritionPath(pathname: string) {
  return isPrefixMatch(pathname, "/nutrition");
}

export function getWorkspaceSubtitle(context: RoleNavContext) {
  return context.role === "sysadmin" ? "Sysadmin Workspace" : "User Workspace";
}

export function getMobileTabsForRole(pathname: string, context: RoleNavContext): MobileNavTabConfig[] {
  if (context.role === "sysadmin") {
    return [];
  }
  if (isNutritionPath(pathname)) return MOBILE_TABS_NUTRITION;
  if (isTrainingPath(pathname)) return MOBILE_TABS_TRAINING;
  if (isCoachToolsPath(pathname)) return MOBILE_TABS_COACH_TOOLS;
  return MOBILE_TABS_DEFAULT;
}

export function getSidebarSectionsForRole(context: RoleNavContext): SidebarSectionConfig[] {
  if (context.role === "sysadmin") {
    return SYSADMIN_SECTIONS;
  }

  return USER_WORKSPACE_SECTIONS;
}
