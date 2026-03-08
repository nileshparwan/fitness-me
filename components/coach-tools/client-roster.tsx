"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Loader2, MoreVertical, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import type { ClientStatus } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useCoachClients, useCoachToolMutations } from "@/hooks/use-coach-tools";
import { cn } from "@/utils";

const STATUSES: ClientStatus[] = ["active", "paused", "blocked", "archived"];

function statusDotClass(status: ClientStatus) {
  if (status === "active") return "bg-chart-2";
  if (status === "paused") return "bg-chart-4";
  if (status === "blocked") return "bg-destructive";
  return "bg-muted-foreground/60";
}

function statusTextClass(status: ClientStatus) {
  if (status === "active") return "text-chart-2";
  if (status === "paused") return "text-chart-4";
  if (status === "blocked") return "text-destructive";
  return "text-muted-foreground";
}

function relativeUpdatedAt(value: string | null) {
  if (!value) return "no recent activity";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "no recent activity";
  return `${formatDistanceToNowStrict(parsed, { addSuffix: true })}`;
}

export function ClientRoster() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("active");
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [newStatus, setNewStatus] = useState<ClientStatus>("active");

  const debouncedSearch = useDebounce(search, 250);

  const clientsQuery = useCoachClients({
    page,
    pageSize: 12,
    search: debouncedSearch,
    status,
  });
  const mutations = useCoachToolMutations();

  const rows = useMemo(() => clientsQuery.data?.rows || [], [clientsQuery.data?.rows]);

  const onCreateClient = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }

    try {
      await mutations.upsertClient.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        timezone,
        status: newStatus,
      });

      setFirstName("");
      setLastName("");
      setEmail("");
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      setNewStatus("active");
      setIsCreateOpen(false);
      toast.success("Client created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="glass-surface surface-pad space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clients</h1>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="accent-strong rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Client</DialogTitle>
                <DialogDescription>Create a client profile. Account linking is optional.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ClientStatus)}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button className="accent-strong rounded-xl" onClick={() => void onCreateClient()} disabled={mutations.upsertClient.isPending}>
                  {mutations.upsertClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="rounded-xl border-border/60 bg-muted/20 pl-9"
              placeholder="Search clients..."
            />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ClientStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20 md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        {clientsQuery.isLoading && !clientsQuery.data ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        ) : rows.length === 0 ? (
          <div className="glass-surface surface-pad text-center text-sm text-muted-foreground">No clients found.</div>
        ) : (
          rows.map((row) => {
            const displayName = row.display_name || `${row.first_name} ${row.last_name || ""}`.trim();
            const activePlans = row.active_assignment ? 1 : 0;
            const lastActivity = relativeUpdatedAt(row.updated_at);

            return (
              <article key={row.id} className="glass-surface surface-pad">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-chart-2/35 bg-chart-2/10">
                      <UserRound className="h-6 w-6 text-chart-2" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold leading-tight">{displayName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className={cn("inline-flex h-2 w-2 rounded-full", statusDotClass(row.status))} />
                        <span className={cn("capitalize", statusTextClass(row.status))}>{row.status}</span>
                        <span>•</span>
                        <span>{activePlans} active plans</span>
                        <span>•</span>
                        <span>{lastActivity}</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-border/50 bg-background/30">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70 bg-card/95">
                      <DropdownMenuItem asChild>
                        <Link href={`/clients/${row.id}`}>Open Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/clients/${row.id}/nutrition`}>Nutrition Hub</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/clients/${row.id}/access`}>Access Control</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="glass-subtle flex items-center justify-between p-3 text-sm">
        <span className="text-muted-foreground">Page {page + 1} • {clientsQuery.data?.total ?? 0} total</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-xl border-border/60" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl border-border/60" disabled={!clientsQuery.data?.has_more} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
