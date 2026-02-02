"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutPDF } from "./workout-pdf-document";
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['workouts']['Row'];
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

interface Props {
  workout: Workout & { user?: { email: string } | null };
  strengthLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
}

export default function DownloadPDFButton({ workout, strengthLogs, cardioLogs }: Props) {
  return (
    <PDFDownloadLink
      document={<WorkoutPDF workout={workout} strengthLogs={strengthLogs} cardioLogs={cardioLogs} />}
      fileName={`${workout.name.replace(/\s+/g, "_")}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          PDF
        </Button>
      )}
    </PDFDownloadLink>
  );
}