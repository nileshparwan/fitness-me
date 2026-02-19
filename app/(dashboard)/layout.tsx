import { SiteFooter } from "@/components/layout/app-footer"
import { AppSidebar } from "@/components/layout/app-sidebar"
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
          <div className="flex h-14 items-center gap-3 px-safe px-3 md:h-16 md:px-4">
            <SidebarTrigger className="h-9 w-9 rounded-xl border bg-background/80 ml-1 -mr-1" />
            <Separator orientation="vertical" className="mr-1 h-5 hidden md:block" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none tracking-tight">FitTrack</span>
              <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
            </div>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-4 px-safe px-3 pb-[88px] md:px-4 md:pb-4">
          <div className="min-h-[calc(100svh-3.5rem)] flex-1 rounded-2xl md:desktop-surface md:min-h-min overflow-hidden">
             {children}
          </div>
        </main>
        
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
