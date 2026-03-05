import { ClientProfileHub } from "@/components/coach-tools/client-profile-hub";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachClientDetailPage({ params }: ClientDetailPageProps) {
  const resolvedParams = await params;
  return (
    <div className="page-shell">
      <ClientProfileHub clientId={resolvedParams.id} />
    </div>
  );
}

