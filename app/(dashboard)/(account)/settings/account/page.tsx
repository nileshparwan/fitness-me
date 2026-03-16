import { redirect } from "next/navigation";

export default function SettingsAccountRedirectPage() {
  redirect("/settings/security");
}
