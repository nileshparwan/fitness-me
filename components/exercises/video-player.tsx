"use client";

import { PlayCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function getYouTubeId(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function VideoPlayer({ url, title }: { url: string | null; title: string }) {
  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div className="aspect-video w-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-6 text-center border rounded-lg">
        <PlayCircle className="h-12 w-12 mb-3 opacity-20" />
        <h3 className="font-medium text-foreground">No Video Preview</h3>
        <p className="text-sm mb-4">No video URL was provided for this exercise.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open(`https://www.youtube.com/results?search_query=how+to+do+${encodeURIComponent(title)}`, '_blank')}
        >
          <ExternalLink className="mr-2 h-3 w-3" />
          Find on YouTube
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={`Video guide for ${title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0"
      />
    </div>
  );
}