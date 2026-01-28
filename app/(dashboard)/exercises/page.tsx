import { Metadata } from "next";
import { ExercisesList } from "@/components/exercises/exercises-list";

export const metadata: Metadata = {
  title: "Exercise Library | Fitness Tracker",
  description: "Manage your collection of exercises.",
};

export default function ExercisesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Exercise Library</h2>
      </div>
      
      {/* The List handles its own state and data fetching */}
      <ExercisesList />
    </div>
  );
}