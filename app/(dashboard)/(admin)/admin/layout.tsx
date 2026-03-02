import { redirect } from "next/navigation";
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
      {children}
    </div>
  );
}
