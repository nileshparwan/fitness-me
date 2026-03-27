"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useUser } from "@/hooks/use-user"
import { Badge } from "@/components/ui/badge"
import { useSettingsStore } from "@/stores/use-settings-store"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function NavUser({ user }: { user: any }) {
  const { isMobile } = useSidebar()
  const { data: userData } = useUser()
  const coach_specialty = useSettingsStore((state) => state.coach_specialty)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // --- LOGIC START ---
  // 1. Unified User Object: Use the hook data if loaded, otherwise fallback to prop
  const activeUser = userData || user;

  // 2. Access profile from profiles table (single source of truth for display data)
  const profile = activeUser?.profile;

  // 3. Name Priority: Profile full_name -> Email segment -> Fallback
  const name =
    profile?.full_name ||
    activeUser?.email?.split('@')[0] ||
    "Athlete";

  // 4. Email Fallback
  const email = activeUser?.email || "user@example.com";

  // 5. Smart Initials: Generate from the actual name (e.g. "John Doe" -> "JD")
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // 6. Avatar URL from profiles table
  const avatarUrl = profile?.avatar_url;
  const specialtyLabel = coach_specialty
    ? coach_specialty.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;
  // --- LOGIC END ---

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {/* Update: Use the extracted avatarUrl variable */}
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs">{email}</span>
                {specialtyLabel ? <Badge variant="secondary" className="mt-1 w-fit rounded-full px-2 py-0.5 text-[10px]">{specialtyLabel}</Badge> : null}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs">{email}</span>
                  {specialtyLabel ? <Badge variant="secondary" className="mt-1 w-fit rounded-full px-2 py-0.5 text-[10px]">{specialtyLabel}</Badge> : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles className="mr-2" />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <BadgeCheck className="mr-2" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <CreditCard className="mr-2" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
              <LogOut className="mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
