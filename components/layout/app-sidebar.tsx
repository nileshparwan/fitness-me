"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Dumbbell,
  Utensils,
  TrendingUp,
  LineChart,
  LayoutDashboard,
  ChartBarIncreasing,
  Folder,
  Menu,
  MoreHorizontal,
  X,
  Sparkles,
  BadgeCheck,
  CreditCard,
  Bell,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { NavUser } from "./nav-user"
import { cn } from "@/utils"
import { Button } from "@/components/ui/button"
import { logoutUser } from "@/app/actions/supabase"

// Define your menu structure here
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  mainNav: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Workouts", url: "/workouts", icon: Dumbbell },
    { title: "Programs", url: "/programs", icon: Folder },
    { title: "Exercises", url: "/exercises", icon: BookOpen },
    { title: "Progress", url: "/progress", icon: TrendingUp },
    { title: "Nutrition", url: "/nutrition", icon: Utensils },
    { title: "Analytics", url: "/analytics", icon: LineChart },
    { title: "AI Coach", url: "/ai-coach", icon: Bot },
  ],
}

// --- NEW MOBILE NAVIGATION COMPONENT ---
function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  // Top 4 items for the bottom bar
  const mobilePrimaryItems = data.mainNav.slice(0, 4)
  // The rest go into the menu
  const mobileSecondaryItems = data.mainNav.slice(4)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t md:hidden pb-safe">
      <div className="grid grid-cols-5 h-full">
        {mobilePrimaryItems.map((item) => {
          const isActive = pathname === item.url
          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          )
        })}

        {/* MORE MENU (Sheet Drawer) */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto">
            <SheetHeader className="text-left mb-6">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col gap-6 pb-10">
              
              {/* 1. Remaining App Links */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Apps</h4>
                <div className="grid grid-cols-2 gap-3">
                  {mobileSecondaryItems.map((item) => (
                    <SheetClose key={item.title} asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all gap-2",
                          pathname === item.url ? "border-primary bg-primary/5" : "border-border"
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

              {/* 2. User Profile Card */}
              <div className="flex items-center gap-3 px-1">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={data.user.avatar} alt={data.user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{data.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{data.user.email}</p>
                </div>
              </div>

              {/* 3. Account Actions (Matching Screenshot) */}
              <div className="space-y-1">
                 <SheetClose asChild>
                   <Link href="/upgrade" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Upgrade to Pro
                   </Link>
                 </SheetClose>
              </div>

              <Separator />

              <div className="space-y-1">
                 <SheetClose asChild>
                   <Link href="/account" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-sm font-medium">
                      <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                      Account
                   </Link>
                 </SheetClose>
                 <SheetClose asChild>
                   <Link href="/billing" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-sm font-medium">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Billing
                   </Link>
                 </SheetClose>
                 <SheetClose asChild>
                   <Link href="/notifications" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-sm font-medium">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      Notifications
                   </Link>
                 </SheetClose>
              </div>

              <Separator />

              {/* 4. Logout */}
              <SheetClose asChild>
                 <button className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium w-full text-left transition-colors" onClick={logoutUser}>
                    <LogOut className="h-4 w-4" />
                    Log out
                 </button>
              </SheetClose>

            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}


// --- MAIN APP SIDEBAR (Desktop Only + Fragment Wrapper) ---
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Hidden on mobile) */}
      <Sidebar collapsible="icon" className="hidden md:flex border-r" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
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
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* 2. MOBILE NAVIGATION (Hidden on desktop) */}
      <MobileNav />
    </>
  )
}