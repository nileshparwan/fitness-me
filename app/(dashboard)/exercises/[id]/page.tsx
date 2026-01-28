import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell, Target, Video, Share2, Plus, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { VideoPlayer } from "@/components/exercises/video-player";
import { ExerciseHistory } from "@/components/exercises/exercise-history"; // Now real
import { ExerciseRecords } from "@/components/exercises/exercise-records"; // Now real
import { getExerciseHistory } from "@/app/actions/analytics";
import { AddToWorkoutButton } from "@/components/exercises/add-to-workout-button";
import { ShareExerciseButton } from "@/components/exercises/share-exercise-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Basic Info
  const { data: exercise, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !exercise) notFound();

  // 2. Fetch Performance History (Using Name to match View logic)
  const history = await getExerciseHistory(exercise.name);

  const formattedDate = new Date(exercise.created_at || Date.now()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/exercises"
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
        </Link>
        <div className="flex gap-2">
          <ShareExerciseButton exercise={exercise} />
          <AddToWorkoutButton exercise={exercise} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title Area */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
              {exercise.name}
            </h1>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                {exercise.category || "General"}
              </Badge>
              {exercise.aliases?.map((alias: string) => (
                <span key={alias} className="italic bg-muted/50 px-1.5 rounded">
                  {alias}
                </span>
              ))}
            </div>
          </div>

          {/* Video Player */}
          <Card className="overflow-hidden border-none shadow-md bg-black/5 dark:bg-card">
            <VideoPlayer url={exercise.video_url} title={exercise.name} />
          </Card>

          {/* TABS: Instructions / History / Records */}
          <Tabs defaultValue="instructions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>

            <TabsContent value="instructions" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Execution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exercise.description ? (
                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line">
                      {exercise.description}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground italic">
                      No specific instructions added for this exercise.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ExerciseHistory history={history} />
            </TabsContent>

            <TabsContent value="records" className="mt-4">
              <ExerciseRecords history={history} type={exercise.category || 'strength'} />
            </TabsContent>
          </Tabs>
        </div>

        {/* --- RIGHT COLUMN (Sidebar) --- */}
        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Exercise DNA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  Target Muscles
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscle_groups && exercise.muscle_groups.length > 0 ? (
                    exercise.muscle_groups.map((muscle: string) => (
                      <Badge key={muscle} variant="outline" className="bg-background">
                        {muscle}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  Equipment Required
                </div>
                <div className="text-sm text-muted-foreground bg-background border rounded-md p-3">
                  {exercise.equipment || "No equipment specified"}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Added</span>
                  <p className="text-sm font-medium">{formattedDate}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Type</span>
                  <p className="text-sm font-medium capitalize">{exercise.category || "Other"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}