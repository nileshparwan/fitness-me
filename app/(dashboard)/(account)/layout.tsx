import { guardServerRole } from "@/lib/auth/server-role-guard";

type AccountLayoutProps = {
  children: React.ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  await guardServerRole(["user", "sysadmin"]);
  return <>{children}</>;
}
