import { SiteFooter } from "@/components/layout/app-footer"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      
      <SidebarInset>
        <header className="sticky top-0 z-40 pt-safe border-b border-border bg-background">
          <div className="flex h-14 items-center gap-3 px-safe px-3 md:h-16 md:px-5 lg:px-6">
            <SidebarTrigger className="hidden h-9 w-9 rounded-xl border bg-background/80 md:inline-flex" />
            <Separator orientation="vertical" className="mr-1 hidden h-5 md:block" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none tracking-tight">FitTrack.ai</span>
              <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
            </div>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-4 px-safe px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:gap-5 md:px-5 md:pb-5 lg:gap-6 lg:px-6 lg:pb-6">
          <div className="min-h-[calc(100svh-3.5rem)] flex-1 rounded-2xl md:desktop-surface md:min-h-min overflow-hidden">
             {children}
          </div>
        </main>
        <MobileBottomNav />
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
