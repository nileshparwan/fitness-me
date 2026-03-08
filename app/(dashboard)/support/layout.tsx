import { guardServerRole } from "@/lib/auth/server-role-guard";

type SupportLayoutProps = {
  children: React.ReactNode;
};

export default async function SupportLayout({ children }: SupportLayoutProps) {
  await guardServerRole(["user"]);
  return <>{children}</>;
}
