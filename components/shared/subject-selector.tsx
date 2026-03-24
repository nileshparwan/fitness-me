"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search } from "lucide-react";

import { listCoachClientsAction } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

export type SubjectSelectorValue = { type: "me" } | { type: "client"; id: string };

type SubjectSelectorProps<TSubject extends SubjectSelectorValue = SubjectSelectorValue> = {
  subject: TSubject;
  onSubjectChange: (subject: TSubject) => void;
  className?: string;
  label?: string;
};

type ClientOption = {
  id: string;
  label: string;
};

function formatClientName(client: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const displayName = client.display_name?.trim();
  if (displayName) return displayName;
  const fallback = `${client.first_name || ""} ${client.last_name || ""}`.trim();
  return fallback || "Client";
}

function valueToSubject(value: string): SubjectSelectorValue {
  if (value === "me") return { type: "me" };
  const id = value.replace("client:", "");
  return { type: "client", id };
}

export function SubjectSelector<TSubject extends SubjectSelectorValue = SubjectSelectorValue>({
  subject,
  onSubjectChange,
  className,
  label = "Subject",
}: SubjectSelectorProps<TSubject>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["subject-selector", "active-clients"],
    queryFn: async () => {
      const result = await listCoachClientsAction({
        status: "active",
        page_size: 50,
      });
      return result.data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const options = useMemo<ClientOption[]>(() => {
    const rows = clientsQuery.data || [];
    return rows.map((row) => ({
      id: row.id,
      label: formatClientName(row),
    }));
  }, [clientsQuery.data]);

  const selectedLabel = useMemo(() => {
    if (subject.type === "me") return "Myself";
    return options.find((option) => option.id === subject.id)?.label || "Client";
  }, [options, subject]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  if (clientsQuery.isLoading) {
    return (
      <div className={cn("grid min-w-[220px] gap-2", className)}>
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-9 w-[230px] rounded-xl" />
      </div>
    );
  }
  if (clientsQuery.error) return null;
  if (options.length === 0) return null;

  return (
    <div className={cn("grid min-w-[220px] gap-2", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[230px] justify-between rounded-xl border-border/60 bg-muted/20"
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,360px)] rounded-xl border-border/70 bg-card/95 p-3">
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
              <div className="divide-y divide-border/50">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                    subject.type === "me" ? "bg-muted/40" : ""
                  )}
                  onClick={() => {
                    onSubjectChange(valueToSubject("me") as TSubject);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate pr-2 text-sm">Myself</span>
                  <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    {subject.type === "me" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                    self
                  </span>
                </button>

                {filteredOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No clients found.</p>
                ) : (
                  filteredOptions.map((client) => {
                    const selected = subject.type === "client" && subject.id === client.id;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                          selected ? "bg-muted/40" : ""
                        )}
                        onClick={() => {
                          onSubjectChange(valueToSubject(`client:${client.id}`) as TSubject);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <span className="truncate pr-2 text-sm">{client.label}</span>
                        <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          {selected ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                          client
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
