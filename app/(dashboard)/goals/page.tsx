import { ClientGoalsMedicalTab } from "@/components/coach-tools/client-goals-medical-tab";

export default function GoalsPage() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage your personal goals. Changes are saved to your goal history automatically.
        </p>
      </header>

      <ClientGoalsMedicalTab mode="self" title="My Goals" />
    </div>
  );
}
