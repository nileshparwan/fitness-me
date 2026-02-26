import { ProgressCoreSkeleton, ExerciseProfileSkeleton } from "./_components/progress-section-skeletons";

export default function ProgressLoading() {
  return (
    <div className="page-shell section-gap max-w-[1600px] mx-auto">
      <div className="native-surface md:desktop-surface surface-pad h-[96px]" />
      <ExerciseProfileSkeleton />
      <ProgressCoreSkeleton />
    </div>
  );
}
