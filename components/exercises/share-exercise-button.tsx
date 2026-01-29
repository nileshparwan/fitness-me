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
import { QRCodeSVG } from "qrcode.react"; 

export function ShareExerciseButton({ exercise }: { exercise: any }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- CRITICAL LOGIC ---
  // We construct the URL to point to the '/share/exercise/' route.
  // This guarantees the recipient lands on the "Instructions Only" page.
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    
    // Example: https://myapp.com/share/exercise/uuid-123
    const origin = window.location.origin;
    return `${origin}/share/exercise/${exercise.id}`;
  };

  const shareUrl = getShareUrl();
  const shareText = `Check out how to do ${exercise.name} on FitTrack!`;

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
    toast.success("Public link copied!");
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
          <DropdownMenuLabel>Share Public Preview</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Smartphone className="mr-2 h-4 w-4" /> Mobile Share
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Copy Public Link
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowQr(true)} className="cursor-pointer">
             <QrCode className="mr-2 h-4 w-4" /> Show QR Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-xs flex flex-col items-center justify-center text-center p-8">
          <DialogHeader className="mb-4">
             <DialogTitle>Scan for Instructions</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-4 rounded-lg shadow-sm">
             <QRCodeSVG value={shareUrl} size={180} />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Anyone scanning this will see the <b>instructions only</b> (no history).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}