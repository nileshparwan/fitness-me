import { guardServerRole } from "@/lib/auth/server-role-guard";

type UserDashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  await guardServerRole(["user"]);
  return <>{children}</>;
}
