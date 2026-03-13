import { ClientProfileHub } from "@/components/coach-tools/client-profile-hub";

type ClientGoalsPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientGoalsPage({ params }: ClientGoalsPageProps) {
  const { clientId } = await params;
  return (
    <div className="page-shell">
      <ClientProfileHub clientId={clientId} initialTab="goals_medical" />
    </div>
  );
}
