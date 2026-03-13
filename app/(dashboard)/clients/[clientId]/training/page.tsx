import { ClientWorkoutHub } from "@/components/coach-tools/client-workout-hub";

type ClientTrainingPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientTrainingPage({ params }: ClientTrainingPageProps) {
  const { clientId } = await params;
  return (
    <div className="page-shell">
      <ClientWorkoutHub clientId={clientId} />
    </div>
  );
}
