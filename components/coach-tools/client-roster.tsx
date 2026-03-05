"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import type { ClientStatus } from "@/app/actions/coach-tools";
import type { ClientRosterRow } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useCoachClients, useCoachToolMutations } from "@/hooks/use-coach-tools";

const STATUSES: ClientStatus[] = ["active", "paused", "blocked", "archived"];

function statusClass(status: ClientStatus) {
  if (status === "active") return "text-emerald-500";
  if (status === "paused") return "text-amber-500";
  if (status === "blocked") return "text-rose-500";
  return "text-muted-foreground";
}

export function ClientRoster() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("active");
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");
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
  const columns = useMemo<ColumnDef<ClientRosterRow>[]>(
    () => [
      {
        accessorKey: "display_name",
        header: "Client",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.display_name || `${row.original.first_name} ${row.original.last_name || ""}`.trim()}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.email || "No email linked"}</div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`text-xs font-medium capitalize ${statusClass(row.original.status)}`}>{row.original.status}</span>
        ),
      },
      {
        id: "next_session",
        header: "Next Session",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.next_session
              ? `#${row.original.next_session.sequence_no} ${row.original.next_session.title}`
              : "No active session"}
          </span>
        ),
      },
      {
        accessorKey: "today_sessions_count",
        header: "Today",
      },
      {
        id: "action",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/clients/${row.original.id}`}>Profile</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/clients/${row.original.id}/nutrition`}>Nutrition</Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
      setTimezone("UTC");
      setNewStatus("active");
      setIsCreateOpen(false);
      toast.success("Client created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Client Roster</h1>
          <p className="text-sm text-muted-foreground">
            Manage clients, monitor today&apos;s sessions, and open each client hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/coach/plans">Plan Templates</Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Client</DialogTitle>
                <DialogDescription>Create a client profile. Client account linking is optional.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ClientStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void onCreateClient()} disabled={mutations.upsertClient.isPending}>
                  {mutations.upsertClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="native-surface surface-pad flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="pl-9"
            placeholder="Search clients..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ClientStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="native-surface surface-pad">
        {clientsQuery.isLoading && !clientsQuery.data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {!clientsQuery.isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No clients found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!clientsQuery.data?.has_more}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
