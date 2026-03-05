import { guardServerRole } from "@/lib/auth/server-role-guard";

type InsightsLayoutProps = {
  children: React.ReactNode;
};

export default async function InsightsLayout({ children }: InsightsLayoutProps) {
  await guardServerRole(["user"]);
  return <>{children}</>;
}
