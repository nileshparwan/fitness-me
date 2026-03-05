import { Lock } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span>This section is read-only. Your coach has disabled editing here.</span>
      </div>
    </div>
  );
}

