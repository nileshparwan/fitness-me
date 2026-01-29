"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NutritionPDF } from "./nutrition-pdf-document";

interface Props {
  program: any;
  meals: any[];
}

export default function DownloadNutritionButton({ program, meals }: Props) {
  return (
    <PDFDownloadLink
      document={<NutritionPDF program={program} meals={meals} />}
      fileName={`${program.name.replace(/\s+/g, "_")}_Plan.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          PDF
        </Button>
      )}
    </PDFDownloadLink>
  );
}