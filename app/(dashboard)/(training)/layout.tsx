import { guardServerRole } from "@/lib/auth/server-role-guard";

type TrainingLayoutProps = {
  children: React.ReactNode;
};

export default async function TrainingLayout({ children }: TrainingLayoutProps) {
  await guardServerRole(["user"]);
  return <>{children}</>;
}
