import { guardServerRole } from "@/lib/auth/server-role-guard";

type NutritionDomainLayoutProps = {
  children: React.ReactNode;
};

export default async function NutritionDomainLayout({ children }: NutritionDomainLayoutProps) {
  await guardServerRole(["user"]);
  return <>{children}</>;
}
