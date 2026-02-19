"use client";

import { useState } from "react";
import { Share2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

// NEW IMPORTS
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Database } from "@/types/database";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];
type WorkoutLog = Database["public"]["Tables"]["workout_logs"]["Row"];
type CardioLog = Database["public"]["Tables"]["cardio_logs"]["Row"];

interface WorkoutActionsProps {
    workout: Workout;
    strengthLogs: WorkoutLog[];
    cardioLogs: CardioLog[];
    isPublicPage?: boolean;
}

const DownloadPDFButton = dynamic(
    () => import("./download-pdf-button"),
    {
        // 2. DISABLE SERVER RENDER (Crucial)
        ssr: false,

        // 3. LOADING STATE (Good UX)
        loading: () => (
            <Button variant="outline" size="sm" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PDF...
            </Button>
        )
    }
);

export function WorkoutActions({ workout, strengthLogs, cardioLogs, isPublicPage = false }: WorkoutActionsProps) {
    const [showShareDialog, setShowShareDialog] = useState(false);

    const handleReaderMode = () => {
        if (typeof window !== "undefined") {
            window.open(`/share/workout/${workout.id}`, "_blank");
        }
    };

    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/share/workout/${workout.id}`
        : "";

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.info("Link copied!");
    };

    return (
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">

            {/* ACTION 1: Direct PDF Download (Safe) */}
            {/* 1. PDF BUTTON (Now Safe & Lazy Loaded) */}
            <DownloadPDFButton
                workout={workout}
                strengthLogs={strengthLogs}
                cardioLogs={cardioLogs}
            />

            {/* ACTION 2: Reader Mode */}
            {!isPublicPage && (
                <Button variant="outline" size="sm" onClick={handleReaderMode}>
                    <Eye className="mr-2 h-4 w-4" /> View
                </Button>
            )}

            {/* ACTION 3: Share */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </DialogTrigger>

                <DialogContent className="w-[calc(100vw-1.5rem)] rounded-xl sm:max-w-md">
                    <DialogHeader className="items-center">
                        <DialogTitle>Share Workout</DialogTitle>
                        <DialogDescription className="text-center">
                            Anyone with this link can view this workout.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 p-3 text-center sm:p-2">
                        <div className="bg-white p-4 rounded-lg shadow-inner border">
                            <QRCodeSVG value={shareUrl} size={150} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Scan to view on mobile or download PDF
                        </p>
                        <div className="flex w-full flex-col gap-2 sm:flex-row">
                            <input
                                readOnly
                                value={shareUrl}
                                className="flex-1 text-xs bg-muted p-2 rounded border truncate"
                            />
                            <Button size="sm" onClick={copyLink} className="w-full sm:w-auto">Copy</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
