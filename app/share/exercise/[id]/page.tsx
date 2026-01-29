import { VideoPlayer } from "@/components/exercises/video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Link, Video } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PublicExercisePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Exercise Definition ONLY
    // Notice we are NOT calling 'getExerciseHistory' here.
    // There is no way for this page to display records because it never asks for them.
    const { data: exercise, error } = await supabase
        .from("exercise_library")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !exercise) notFound();

    return (
        <div className="min-h-screen bg-background flex flex-col items-center p-4">
            {/* Branding Header */}
            <div className="w-full max-w-3xl flex justify-between items-center mb-6">
                <h2 className="font-bold text-xl">FitTrack</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/login">Log In</Link>
                </Button>
            </div>

            {/* Safe Content */}
            <div className="max-w-3xl w-full space-y-6">
                <h1 className="text-3xl font-bold">{exercise.name}</h1>

                {/* Video & Instructions */}
                <VideoPlayer url={exercise.video_url} title={exercise.name} />

                {/* <div className="prose dark:prose-invert">
            <h3>Instructions</h3>
            <p>{exercise.description || "No instructions provided."}</p>
          </div> */}

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
            </div>
        </div>
    );
}