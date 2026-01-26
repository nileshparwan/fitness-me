import { EventSchemas } from "inngest";

type AnalyzeWorkoutEvent = {
    data: {
        queueId: string; // ID from ai_processing_queue
        userId: string;
        rawText: string;
    };
};

type AnalyzePhotoEvent = {
    data: {
        queueId: string;
        userId: string;
        imageUrl: string;
        comparisonImageUrl?: string; // Optional: for before/after
    };
};

type WeeklyReportEvent = {
    data: {} // No data needed, triggered by Cron
};

type GenerateUserReportEvent = {
    data: {
      userId: string;
    };
  };

export type Events = {
    "ai/analyze.workout": AnalyzeWorkoutEvent;
    "ai/analyze.photo": AnalyzePhotoEvent;
    "app/weekly.report": WeeklyReportEvent;
    "app/generate.user.report": GenerateUserReportEvent; 
    "admin/run.reminders": { data: {} }
  };
// Create the schema to pass to the client
export const InngestSchemas = new EventSchemas().fromRecord<Events>();