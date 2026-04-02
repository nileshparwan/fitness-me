"use client";

import React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['workouts']['Row'];
type WorkoutLog = Database['public']['Tables']['workout_sets']['Row'];
type CardioLog = Database['public']['Tables']['workout_cardio']['Row'];

interface Props {
  workout: Workout & { user?: { email: string } | null };
  strengthLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
}

export default function DownloadPDFButton({ workout, strengthLogs, cardioLogs }: Props) {
  const [isPreparing, setIsPreparing] = React.useState(false);

  const handleDownload = React.useCallback(async () => {
    setIsPreparing(true);
    try {
      const [{ pdf }, { WorkoutPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./workout-pdf-document"),
      ]);
      const blob = await pdf(
        <WorkoutPDF workout={workout} strengthLogs={strengthLogs} cardioLogs={cardioLogs} />
      ).toBlob();

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${workout.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsPreparing(false);
    }
  }, [cardioLogs, strengthLogs, workout]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
      disabled={isPreparing}
      onClick={handleDownload}
    >
      {isPreparing ? <Loader2 className="mr-0 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" /> : <Download className="mr-0 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />}
      <span className="hidden sm:inline">PDF</span>
    </Button>
  );
}
