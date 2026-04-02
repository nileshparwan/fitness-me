"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Globe, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { useNutritionGroupMutations } from "@/hooks/use-nutrition-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

type ShareMealGroupSheetProps = {
  mealGroupId: string;
  mealGroupName: string;
  isPublic: boolean;
  publicShareToken: string;
};

export function ShareMealGroupSheet({
  mealGroupId,
  mealGroupName,
  isPublic,
  publicShareToken,
}: ShareMealGroupSheetProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const mutations = useNutritionGroupMutations();

  useEffect(() => {
    if (typeof window === "undefined" || !publicShareToken) return;
    setShareUrl(`${window.location.origin}/share/nutrition/${publicShareToken}`);
  }, [publicShareToken]);

  const canShare = isPublic && Boolean(shareUrl);
  const toggleLabel = useMemo(
    () => (isPublic ? "Disable public link" : "Enable public link"),
    [isPublic]
  );

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };

  const handleNativeShare = async () => {
    if (!canShare || typeof navigator === "undefined" || !navigator.share) {
      toast.error("Sharing not supported");
      return;
    }
    try {
      await navigator.share({ title: mealGroupName, url: shareUrl });
    } catch {}
  };

  const handleTogglePublicShare = async () => {
    const result = await withToastFeedback(
      mutations.togglePublicShare.mutateAsync({
        nutrition_plan_id: mealGroupId,
        is_public: !isPublic,
      }),
      {
        loading: isPublic ? "Disabling public link..." : "Enabling public link...",
        success: isPublic ? "Public sharing disabled" : "Public sharing enabled",
        error: "Unable to update sharing",
      }
    ).catch(() => null);
    if (!result) return;
  };

  const content = (
    <div className="space-y-4 py-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Public link</p>
            <p className="text-sm text-muted-foreground">
              {isPublic
                ? "Anyone with the link can view this meal template."
                : "Public sharing is currently disabled for this meal template."}
            </p>
          </div>
          <Button
            type="button"
            variant={isPublic ? "outline" : "default"}
            className="rounded-xl"
            onClick={() => void handleTogglePublicShare()}
            disabled={mutations.togglePublicShare.isPending}
          >
            <Globe className="mr-2 h-4 w-4" />
            {toggleLabel}
          </Button>
        </div>
      </div>

      {isPublic ? (
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Public Link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl} />
                <Button size="icon" onClick={() => void handleCopy()} disabled={!shareUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={() => void handleNativeShare()} disabled={!canShare}>
              <Smartphone className="mr-2 h-4 w-4" />
              Share via Phone
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-inner">
              {shareUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                  alt="QR code for meal group share link"
                  className="h-48 w-48"
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">Scan to view on mobile.</p>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-border/60">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent size={{ tablet: "md", desktop: "md" }}>
        <DialogHeader>
          <DialogTitle>Share Meal Template</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
