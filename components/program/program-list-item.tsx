import { Folder, Dumbbell, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils";
import { Badge } from "@/components/ui/badge";

interface ProgramListItemProps {
  program: any;
  isSelected: boolean;
  isSelectionMode: boolean;
}

export function ProgramListItem({ program, isSelected, isSelectionMode }: ProgramListItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-xl border transition-all shadow-sm group bg-card mb-2",
      isSelectionMode ? "cursor-pointer" : "hover:bg-accent/5",
      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
    )}>
      
      {/* Icon Box */}
      <div className={cn(
        "flex shrink-0 items-center justify-center h-12 w-12 rounded-lg border transition-colors",
        isSelected ? "bg-primary/20 border-primary/30" : "bg-muted/20 border-muted-foreground/10"
      )}>
        {isSelectionMode && isSelected ? (
           <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20" />
        ) : (
           <Folder className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
           <h3 className="font-semibold text-base truncate">{program.name}</h3>
           <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
              {program.training_plan_items?.[0]?.count || 0} Items
           </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {program.description || "No description provided"}
        </p>
      </div>

      {/* Selection Checkbox (Visual only, state handled by parent) */}
      {isSelectionMode && (
        <div className={cn(
          "h-5 w-5 rounded-full border shrink-0 flex items-center justify-center ml-2 transition-colors",
          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
        )}>
           {isSelected && <div className="h-2 w-2 bg-background rounded-full" />}
        </div>
      )}
    </div>
  );
}