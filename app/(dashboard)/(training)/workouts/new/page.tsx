"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Pencil, Save } from "lucide-react";

import { WorkoutAiTextTab } from "@/components/workout/workout-ai-text-tab";
import { WorkoutForm } from "@/components/workout/workout-form";
import { WorkoutPreview } from "@/components/workout/workout-preview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkoutFormValues } from "@/types/workout";

type ActiveTab = "builder" | "preview" | "ai";

const EMPTY_WORKOUT: WorkoutFormValues = {
  name: "",
  notes: "",
  date: new Date(),
  sport_type: "",
  location: "",
  perceived_exertion: undefined,
  overall_rating: undefined,
  template_id: "",
  programIds: [],
  exercises: [],
};

export default function NewWorkoutPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("builder");
  const [supersetDialogOpen, setSupersetDialogOpen] = useState(false);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);
  const [draftData, setDraftData] = useState<WorkoutFormValues>(EMPTY_WORKOUT);

  return (
    <div className="page-shell mx-auto max-w-3xl pb-24 md:pb-10">
      <div className="section-gap">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => router.push("/workouts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-tight">New Workout</h1>
              <p className="text-xs text-muted-foreground">Build a session from scratch.</p>
            </div>
          </div>
          {activeTab === "builder" ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-3"
                onClick={() => setMetaSheetOpen(true)}
              >
                <Pencil className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-3"
                onClick={() => setSupersetDialogOpen(true)}
              >
                <Layers className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Superset</span>
              </Button>
              <Button form="workout-new-form" type="submit" className="accent-strong h-9 rounded-xl px-5 text-black">
                <Save className="mr-0 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="ai">AI Text</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "builder" ? (
          <WorkoutForm
            formId="workout-new-form"
            initialData={draftData}
            onDraftChange={setDraftData}
            supersetDialogOpen={supersetDialogOpen}
            onSupersetDialogOpenChange={setSupersetDialogOpen}
            metaSheetOpen={metaSheetOpen}
            onMetaSheetOpenChange={setMetaSheetOpen}
          />
        ) : null}
        {activeTab === "preview" ? <WorkoutPreview initialData={draftData} /> : null}
        {activeTab === "ai" ? <WorkoutAiTextTab /> : null}
      </div>
    </div>
  );
}
