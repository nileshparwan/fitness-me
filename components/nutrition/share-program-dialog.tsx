"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Smartphone, Download } from "lucide-react";
import { toast } from "sonner";

export function ShareProgramDialog({ programId, programName }: { programId: string, programName: string }) {
  const [open, setOpen] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/nutrition/${programId}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: programName,
          text: `Check out my nutrition plan: ${programName}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or failed
      }
    } else {
      toast.error("Sharing is not supported on this device");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </DialogTrigger>
      {/* Mobile Icon Only Trigger */}
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
           <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Nutrition Plan</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 py-4">
            <div className="flex flex-col gap-4">
               <div className="grid gap-2">
                 <Label>Public Link</Label>
                 <div className="flex items-center gap-2">
                   <Input readOnly value={shareUrl} />
                   <Button size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                 </div>
               </div>
               
               <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
               </div>

               <Button className="w-full" onClick={handleNativeShare}>
                 <Smartphone className="mr-2 h-4 w-4" /> Share via Phone
               </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="qr" className="flex flex-col items-center justify-center py-6 space-y-4">
             <div className="bg-white p-4 rounded-lg shadow-inner border">
                {/* Using a reliable public API for QR generation to avoid heavy dependencies */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
             </div>
             <p className="text-sm text-muted-foreground text-center">
               Scan this code to view the plan on mobile.
             </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}