"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutPDF } from "./workout-pdf-document";

interface Props {
  workout: any;
  strengthLogs: any[];
  cardioLogs: any[];
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