import { guardServerRole } from "@/lib/auth/server-role-guard";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await guardServerRole(["sysadmin"]);

  return (
    <div className="page-shell section-gap">
      {children}
    </div>
  );
}
