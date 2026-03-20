"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { flattenProgramAssigneePages, useProgramAssigneeMutation, useProgramAssignees } from "@/hooks/use-program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils";

type Props = {
  programId: string;
  currentClientId: string | null;
  currentClientName: string;
};

export function ProgramAssigneeDropdown({ programId, currentClientId, currentClientName }: Props) {
  const router = useRouter();
  const mutation = useProgramAssigneeMutation();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(currentClientId || "self");
  const [selectedName, setSelectedName] = useState(currentClientName);

  useEffect(() => {
    setSelectedId(currentClientId || "self");
    setSelectedName(currentClientName);
  }, [currentClientId, currentClientName]);

  const query = useProgramAssignees(programId, search, open);
  const items = useMemo(() => flattenProgramAssigneePages(query.data), [query.data]);

  const onAssign = async (input: { id: string; name: string; isSelf: boolean }) => {
    try {
      const result = await mutation.mutateAsync(
        input.isSelf
          ? {
              program_id: programId,
              self: true,
            }
          : {
              program_id: programId,
              client_id: input.id,
              self: false,
            }
      );
      setSelectedId(input.id);
      setSelectedName(result.client_name || input.name);
      setOpen(false);
      setSearch("");
      toast.success(`Assigned to ${result.client_name || input.name}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign program.");
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Assigned Client</p> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 min-w-[230px] justify-between rounded-xl border-border/60 bg-muted/20">
            <span className="truncate text-left">{selectedName}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] rounded-xl border-border/70 bg-card/95 p-3">
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
                    const isDisabled = mutation.isPending || (!isSelf && !item.linked_user_id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-55",
                          selectedId === item.id ? "bg-muted/40" : ""
                        )}
                        onClick={() =>
                          void onAssign({
                            id: item.id,
                            name: item.full_name || `${isSelf ? "Myself" : `Client ${item.id.slice(0, 8)}`}`,
                            isSelf,
                          })
                        }
                        disabled={isDisabled}
                      >
                        <span className="truncate pr-2 text-sm">{item.full_name || `${isSelf ? "Myself" : `Client ${item.id.slice(0, 8)}`}`}</span>
                        <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          {selectedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                          {isSelf ? "self" : item.linked_user_id ? "linked" : "unlinked"}
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
                disabled={query.isFetchingNextPage || mutation.isPending}
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
