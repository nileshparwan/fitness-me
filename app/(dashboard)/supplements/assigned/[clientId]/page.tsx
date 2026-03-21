import { SupplementsDetailPage } from "@/components/supplements/supplements-detail-page";

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ stack?: string }>;
};

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export default async function SupplementsAssignedClientRoute({ params, searchParams }: Props) {
  const { clientId } = await params;
  const { stack } = await searchParams;
  const profileId = isUuid(stack) ? stack : undefined;

  return (
    <div className="page-shell">
      <SupplementsDetailPage subject={{ type: "client", id: clientId }} profileId={profileId} />
    </div>
  );
}
