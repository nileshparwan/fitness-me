import { WorkoutForm } from "@/components/workout/workout-form";
import { Separator } from "@/components/ui/separator";

export default function NewWorkoutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Log Workout</h3>
        <p className="text-sm text-muted-foreground">
          Record your session manually or choose a template.
        </p>
      </div>
      <Separator />
      <WorkoutForm />
    </div>
  );
}