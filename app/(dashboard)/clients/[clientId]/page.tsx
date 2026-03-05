import { ClientProfileHub } from "@/components/coach-tools/client-profile-hub";

type ClientDetailAliasPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientDetailAliasPage({ params }: ClientDetailAliasPageProps) {
  const { clientId } = await params;
  return (
    <div className="page-shell">
      <ClientProfileHub clientId={clientId} />
    </div>
  );
}

