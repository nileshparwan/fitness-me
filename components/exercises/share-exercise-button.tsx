"use client";

import { useState } from "react";
import { Share2, Link as LinkIcon, Smartphone, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react"; // Run: npm install qrcode.react

export function ShareExerciseButton({ exercise }: { exercise: any }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Construct the URL (assumes client is on the page, or build absolute URL)
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Check out ${exercise.name} on FitTrack! Target muscles: ${exercise.muscle_groups?.join(", ")}.`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: exercise.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share canceled");
      }
    } else {
      toast.error("Sharing not supported on this device");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Share to...</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* 1. Native Mobile Share */}
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Smartphone className="mr-2 h-4 w-4" /> Mobile Share
          </DropdownMenuItem>

          {/* 2. Copy Link */}
          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Copy Link
          </DropdownMenuItem>
          
          {/* 3. QR Code Modal */}
          <DropdownMenuItem onClick={() => setShowQr(true)} className="cursor-pointer">
             <QrCode className="mr-2 h-4 w-4" /> Gym Buddy QR
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Dialog (for when your friend wants to scan your screen) */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-xs flex flex-col items-center justify-center text-center p-8">
          <DialogHeader className="mb-4">
             <DialogTitle>Scan to Open</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-4 rounded-lg shadow-sm">
             <QRCodeSVG value={shareUrl} size={180} />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Have your gym partner scan this to view <b>{exercise.name}</b> on their phone.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}