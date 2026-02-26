import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/auth";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="page-shell section-gap">
      <div className="native-surface md:desktop-surface surface-pad">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin Console</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Operational controls for users, training, nutrition, analytics, and platform settings.
        </p>
      </div>

      <AdminNav />
      {children}
    </div>
  );
}
