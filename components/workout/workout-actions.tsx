"use client";

import { useState, useEffect } from "react";
import { Share2, Eye, Download, Loader2 } from "lucide-react";
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
import { PDFDownloadLink } from "@react-pdf/renderer";
import { WorkoutPDF } from "./workout-pdf-document";
import { toast } from "sonner";

interface WorkoutActionsProps {
    workout: any;
    strengthLogs: any[];
    cardioLogs: any[];
    isPublicPage?: boolean;
}

export function WorkoutActions({ workout, strengthLogs, cardioLogs, isPublicPage = false }: WorkoutActionsProps) {
    const [showShareDialog, setShowShareDialog] = useState(false);

    // Need to ensure client-side rendering for PDF generation
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true) }, []);

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
        <div className="flex gap-2">

            {/* ACTION 1: Direct PDF Download (Safe) */}
            {isClient && (
                <PDFDownloadLink
                    document={
                        <WorkoutPDF
                            workout={workout}
                            strengthLogs={strengthLogs}
                            cardioLogs={cardioLogs}
                        />
                    }
                    fileName={`${workout.name.replace(/\s+/g, "_")}.pdf`}
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
            )}

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

                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center">
                        <DialogTitle>Share Workout</DialogTitle>
                        <DialogDescription className="text-center">
                            Anyone with this link can view this workout.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center text-center space-y-4 p-2">
                        <div className="bg-white p-4 rounded-lg shadow-inner border">
                            <QRCodeSVG value={shareUrl} size={150} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Scan to view on mobile or download PDF
                        </p>
                        <div className="w-full flex gap-2">
                            <input
                                readOnly
                                value={shareUrl}
                                className="flex-1 text-xs bg-muted p-2 rounded border truncate"
                            />
                            <Button size="sm" onClick={copyLink}>Copy</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}