"use client"

import * as React from "react"
import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  ChevronRight,
  Command,
  Dumbbell,
  Folder,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Target,
  TrendingUp,
  User,
  Users,
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/utils"
import { useRole } from "@/hooks/use-role"
import {
  getRoleHomePath,
  getSidebarSectionsForRole,
  type SidebarItemConfig
} from "@/lib/auth/route-access"
import { NavUser } from "./nav-user"

const iconMap = {
  home: LayoutDashboard,
  dumbbell: Dumbbell,
  folder: Folder,
  book: BookOpen,
  nutrition: Utensils,
  trend: TrendingUp,
  bot: Bot,
  support: MessageSquare,
  target: Target,
  user: User,
  shield: Shield,
  settings: Settings,
  users: Users,
  message: MessageSquare,
  building: Building2,
  bell: Bell,
} as const

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function hasActiveChild(pathname: string, item: SidebarItemConfig) {
  return (item.children ?? []).some((child) => isRouteActive(pathname, child.href))
}

type ItemRowProps = {
  item: SidebarItemConfig
  pathname: string
  expandedState: Record<string, boolean>
  onToggle: (href: string) => void
}

function ItemRow({ item, pathname, expandedState, onToggle }: ItemRowProps) {
  const Icon = iconMap[item.icon]
  const active = isRouteActive(pathname, item.href)
  const childActive = hasActiveChild(pathname, item)
  const hasChildren = Boolean(item.children?.length)
  const expanded = hasChildren ? (expandedState[item.href] ?? childActive) : false

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active || childActive} tooltip={item.title}>
        <Link href={item.href}>
          <Icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>

      {hasChildren ? (
        <SidebarMenuAction
          aria-label={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
          onClick={() => onToggle(item.href)}
          showOnHover
        >
          <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
        </SidebarMenuAction>
      ) : null}

      {hasChildren && expanded ? (
        <SidebarMenuSub>
          {item.children?.map((child) => {
            const ChildIcon = iconMap[child.icon]
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton asChild isActive={isRouteActive(pathname, child.href)}>
                  <Link href={child.href}>
                    <ChildIcon />
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: roleContext, isLoading } = useRole()

  const navContext = React.useMemo(() => {
    if (roleContext) {
      return {
        role: roleContext.role,
      }
    }

    return null
  }, [roleContext])

  const sections = React.useMemo(() => (navContext ? getSidebarSectionsForRole(navContext) : []), [navContext])
  const homePath = navContext ? getRoleHomePath(navContext) : "/dashboard"

  const [expandedState, setExpandedState] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setExpandedState((previous) => {
      const next = { ...previous }
      for (const section of sections) {
        for (const item of section.items) {
          if (item.children?.length && hasActiveChild(pathname, item) && next[item.href] === undefined) {
            next[item.href] = true
          }
        }
      }
      return next
    })
  }, [pathname, sections])

  const toggleSubmenu = React.useCallback((href: string) => {
    setExpandedState((previous) => ({
      ...previous,
      [href]: !(previous[href] ?? true),
    }))
  }, [])

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homePath}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">FitTrack.ai</span>
                  <span className="truncate text-xs capitalize">
                    {navContext?.role ?? "secure"} Workspace
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden overflow-y-auto pr-1">
        {isLoading ? (
          <SidebarGroup>
            <SidebarGroupLabel>Loading</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <ItemRow
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    expandedState={expandedState}
                    onToggle={toggleSubmenu}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={null} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
