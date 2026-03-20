"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { flattenMealGroupAssigneePages, useMealGroupAssignees } from "@/hooks/use-meal-groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils";

type Props = {
  mealGroupId: string;
  currentAssigneeId: string;
  currentAssigneeName: string;
  pending?: boolean;
  disabled?: boolean;
  onAssign: (input: { id: string; name: string; isSelf: boolean; subjectUserId?: string | null }) => Promise<void>;
};

export function MealGroupAssigneeDropdown({
  mealGroupId,
  currentAssigneeId,
  currentAssigneeName,
  pending = false,
  disabled = false,
  onAssign,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(currentAssigneeId);
  const [selectedName, setSelectedName] = useState(currentAssigneeName);

  useEffect(() => {
    setSelectedId(currentAssigneeId);
    setSelectedName(currentAssigneeName);
  }, [currentAssigneeId, currentAssigneeName]);

  const query = useMealGroupAssignees(mealGroupId, search, open);
  const items = useMemo(() => flattenMealGroupAssigneePages(query.data), [query.data]);

  const assign = async (input: { id: string; name: string; isSelf: boolean; subjectUserId?: string | null }) => {
    try {
      await onAssign(input);
      setSelectedId(input.id);
      setSelectedName(input.name);
      setOpen(false);
      setSearch("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update assignment.");
    }
  };

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      {/* <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Assigned Client</p> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 w-full justify-between rounded-xl border-border/60 bg-muted/20 sm:min-w-[230px] sm:w-auto"
            disabled={disabled || pending}
          >
            <span className="truncate text-left">{selectedName}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(92vw,360px)] rounded-xl border-border/70 bg-card/95 p-3">
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients..."
                className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border/60">
              {query.isLoading ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading clients...</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No clients found.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {items.map((item) => {
                    const isSelf = item.is_self === true;
                    const label = item.full_name || (isSelf ? "Myself" : `Client ${item.id.slice(0, 8)}`);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-55",
                          selectedId === item.id ? "bg-muted/40" : ""
                        )}
                        onClick={() =>
                          void assign({
                            id: item.id,
                            name: label,
                            isSelf,
                            subjectUserId: isSelf ? item.linked_user_id : null,
                          })
                        }
                        disabled={pending}
                      >
                        <span className="truncate pr-2 text-sm">{label}</span>
                        <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          {selectedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                          {isSelf ? "self" : "client"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {query.hasNextPage ? (
              <Button
                variant="outline"
                className="h-9 w-full rounded-lg border-border/60 bg-muted/20"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage || pending}
              >
                {query.isFetchingNextPage ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Load more"
                )}
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
