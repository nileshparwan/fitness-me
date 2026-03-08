import { ClientAccessControl } from "@/components/coach-tools/client-access-control";

type ClientAccessPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientAccessPage({ params }: ClientAccessPageProps) {
  const { clientId } = await params;
  return (
    <div className="page-shell">
      <ClientAccessControl clientId={clientId} />
    </div>
  );
}
