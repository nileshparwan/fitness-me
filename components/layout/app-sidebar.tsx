"use client"

import * as React from "react"
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  Command,
  CreditCard,
  Dumbbell,
  Folder,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Shield,
  MessageSquare,
  Target,
  TrendingUp,
  Utensils,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils"
import { logoutUser } from "@/app/actions/supabase"
import { useUser } from "@/hooks/use-user"
import { NavUser } from "./nav-user"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  sections: [
    {
      label: "Overview",
      items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Training",
      items: [
        { title: "Training Sessions", url: "/workouts", icon: Dumbbell },
        { title: "Training Plans", url: "/programs", icon: Folder },
        { title: "Exercise Catalog", url: "/exercises", icon: BookOpen },
      ],
    },
    {
      label: "Nutrition",
      items: [{ title: "Meal Plans", url: "/nutrition", icon: Utensils }],
    },
    {
      label: "Insights",
      items: [
        { title: "Progress", url: "/progress", icon: TrendingUp },
        { title: "AI Coach", url: "/ai-coach", icon: Bot },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Fitness Goals", url: "/settings/goals", icon: Target },
        { title: "Support", url: "/support", icon: MessageSquare },
      ],
    },
    {
      label: "Admin",
      items: [
        { title: "Admin Console", url: "/admin", icon: Shield },
        { title: "Admin Users", url: "/admin/users", icon: BadgeCheck },
        { title: "Admin Training", url: "/admin/training", icon: Dumbbell },
        { title: "Admin Nutrition", url: "/admin/nutrition", icon: Utensils },
        { title: "Admin Analytics", url: "/admin/analytics", icon: TrendingUp },
        { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
        { title: "Admin Settings", url: "/admin/settings", icon: CreditCard },
      ],
    },
  ] as { label: string; items: NavItem[] }[],
}

const mobilePrimaryItems: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Sessions", url: "/workouts", icon: Dumbbell },
  { title: "Plans", url: "/programs", icon: Folder },
  { title: "Progress", url: "/progress", icon: TrendingUp },
]

const mobilePrimaryUrls = new Set(mobilePrimaryItems.map((item) => item.url))

function isRouteActive(pathname: string, url: string) {
  if (url === "/dashboard") return pathname === "/dashboard"
  return pathname === url || pathname.startsWith(`${url}/`)
}

function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const { data: activeUser } = useUser()
  const role =
    typeof activeUser?.user_metadata?.role === "string"
      ? String(activeUser.user_metadata.role).toLowerCase()
      : "user"
  const isAdmin = role === "admin"
  const mobileSecondaryItems = data.sections
    .filter((section) => (section.label === "Admin" ? isAdmin : true))
    .flatMap((section) => section.items)
    .filter((item) => !mobilePrimaryUrls.has(item.url))

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background pb-safe md:hidden">
      <div className="grid h-full grid-cols-5">
        {mobilePrimaryItems.map((item) => {
          const active = isRouteActive(pathname, item.url)
          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "fill-current")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          )
        })}

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-xl">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-6 pb-10">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apps</h4>
                <div className="grid grid-cols-2 gap-3">
                  {mobileSecondaryItems.map((item) => (
                    <SheetClose key={item.title} asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:bg-accent/50",
                          isRouteActive(pathname, item.url) ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <item.icon className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 px-1">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={data.user.avatar} alt={data.user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{data.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{data.user.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <SheetClose asChild>
                  <Link href="/upgrade" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Upgrade to Pro
                  </Link>
                </SheetClose>
              </div>

              <Separator />

              <div className="space-y-1">
                <SheetClose asChild>
                  <Link href="/account" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                    <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                    Account
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/billing" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Billing
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/notifications" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Notifications
                  </Link>
                </SheetClose>
              </div>

              <Separator />

              <SheetClose asChild>
                <button
                  className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  onClick={logoutUser}
                >
                  <span className="inline-flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </span>
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: activeUser } = useUser()
  const role =
    typeof activeUser?.user_metadata?.role === "string"
      ? String(activeUser.user_metadata.role).toLowerCase()
      : "user"
  const isAdmin = role === "admin"
  const sections = data.sections
    .filter((section) => (section.label === "Admin" ? isAdmin : true))
    .map((section) => ({ ...section, items: section.items }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      <Sidebar collapsible="icon" className="hidden border-r border-border/70 md:flex" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">FitTrack.ai</span>
                    <span className="truncate text-xs">Pro Plan</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {sections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isRouteActive(pathname, item.url)}
                        className="rounded-xl py-5"
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <MobileNav />
    </>
  )
}
