"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ShareProgramDialog({ programId, programName }: { programId: string, programName: string }) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/share/nutrition/${programId}`);
    }
  }, [programId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: programName, url: shareUrl });
      } catch (err) {}
    } else {
      toast.error("Sharing not supported");
    }
  };

  const Content = (
    <Tabs defaultValue="link" className="w-full py-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="link">Link</TabsTrigger>
        <TabsTrigger value="qr">QR Code</TabsTrigger>
      </TabsList>
      
      <TabsContent value="link" className="space-y-4 pt-4">
        <div className="flex flex-col gap-4">
           <div className="grid gap-2">
             <Label>Public Link</Label>
             <div className="flex items-center gap-2">
               <Input readOnly value={shareUrl} />
               <Button size="icon" onClick={handleCopy} disabled={!shareUrl}><Copy className="h-4 w-4" /></Button>
             </div>
           </div>
           <Button className="w-full" onClick={handleNativeShare} disabled={!shareUrl}>
             <Smartphone className="mr-2 h-4 w-4" /> Share via Phone
           </Button>
        </div>
      </TabsContent>
      
      <TabsContent value="qr" className="flex flex-col items-center justify-center py-4 space-y-4">
         <div className="bg-white p-4 rounded-lg shadow-inner border">
            {shareUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`} 
                alt="QR Code" 
                className="w-48 h-48"
                />
            )}
         </div>
         <p className="text-sm text-muted-foreground">Scan to view on mobile.</p>
      </TabsContent>
    </Tabs>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {/* FIX: Render SINGLE element directly (Desktop Button) */}
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Share Plan</DialogTitle></DialogHeader>{Content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* FIX: Render SINGLE element directly (Mobile Button) */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)}>
            <Share2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl"><SheetHeader className="text-left"><SheetTitle>Share Plan</SheetTitle></SheetHeader>{Content}</SheetContent>
    </Sheet>
  );
}