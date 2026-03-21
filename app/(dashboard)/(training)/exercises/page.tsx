import { Metadata } from "next";
import { ExercisesList } from "@/components/exercises/exercises-list";

export const metadata: Metadata = {
  title: "Exercise Library | Fitness Tracker",
  description: "Manage your collection of exercises.",
};

export default function ExercisesPage() {
  return (
    <div className="page-shell section-gap flex h-full flex-1 flex-col pb-24 md:pb-10">
      <ExercisesList />
    </div>
  );
}
