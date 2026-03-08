import { guardServerRole } from "@/lib/auth/server-role-guard";
import { MobileNutritionNav } from "@/components/nutrition/mobile-nutrition-nav";

type NutritionDomainLayoutProps = {
  children: React.ReactNode;
};

export default async function NutritionDomainLayout({ children }: NutritionDomainLayoutProps) {
  await guardServerRole(["user"]);
  return (
    <>
      <MobileNutritionNav />
      {children}
    </>
  );
}
