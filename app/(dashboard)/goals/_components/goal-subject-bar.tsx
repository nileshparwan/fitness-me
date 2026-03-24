"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { listCoachClientsAction } from "@/app/actions/coach-tools";
import { ClientGoalsMedicalTab } from "@/components/coach-tools/client-goals-medical-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

type ClientOption = { id: string; label: string };
const MYSELF: ClientOption = { id: "me", label: "My Goals" };

function resolveClientLabel(client: {
  display_name: string | null;
  first_name: string;
  last_name: string | null;
}) {
  const fullName = [client.first_name, client.last_name || ""].join(" ").trim();
  return client.display_name || fullName || "Client";
}

export function GoalSubjectBar() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientOption>(MYSELF);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await listCoachClientsAction({
          status: "active",
          page_size: 50,
        });

        if (cancelled) return;

        const options: ClientOption[] = (res.data || []).map((client) => ({
          id: client.id,
          label: resolveClientLabel(client),
        }));
        setClients(options);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all = [MYSELF, ...clients];
    if (!query) return all;
    return all.filter((client) => client.label.toLowerCase().includes(query));
  }, [clients, search]);

  const clientId = selected.id === MYSELF.id ? undefined : selected.id;
  const mode = clientId ? "client" : "self";
  const title = clientId ? `${selected.label}'s Goals` : "My Goals";

  return (
    <>
      {/* Controls row — skeleton while loading, dropdown after, hidden for non-coaches */}
      {loading ? (
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-[230px] rounded-xl" />
        </div>
      ) : clients.length > 0 ? (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Viewing goals for:</span>
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 min-w-[230px] justify-between rounded-xl border-border/60 bg-muted/20">
              <span className="truncate text-left">{selected.label}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] rounded-xl border-border/70 bg-card/95 p-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                  className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-border/60">
                {filteredClients.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No results.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredClients.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                          selected.id === item.id ? "bg-muted/40" : ""
                        )}
                        onClick={() => {
                          setSelected(item);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <span className="truncate pr-2 text-sm">{item.label}</span>
                        {selected.id === item.id ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      ) : null}

      {/* Table — always renders immediately, never gated behind the dropdown fetch */}
      <ClientGoalsMedicalTab mode={mode} clientId={clientId} title={title} />
    </>
  );
}
