import { redirect } from "next/navigation";

export default function SettingsRootRedirectPage() {
  redirect("/settings/profile");
}
