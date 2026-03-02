"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  adminUpdateTicketAction,
  listAdminTicketsAction,
  type TicketCategory,
  type TicketRow,
  type TicketStatus,
} from "@/app/actions/tickets";
import { Json } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const CATEGORY_OPTIONS: TicketCategory[] = ["exercise_request", "feature_request", "bug_report", "other"];

const resolutionSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  admin_notes: z.string().max(5000).optional(),
  metadata_patch: z.string().optional(),
});

type ResolutionValues = z.infer<typeof resolutionSchema>;

function getStatusVariant(status: TicketStatus) {
  if (status === "resolved") return "default";
  if (status === "closed") return "secondary";
  if (status === "in_progress") return "outline";
  return "secondary";
}

function humanize(input: string) {
  return input.replaceAll("_", " ");
}

export function TicketsDashboard() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [category, setCategory] = useState<TicketCategory | "all">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const debouncedSearch = useDebounce(search, 350);

  const form = useForm<ResolutionValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: {
      status: "in_progress",
      admin_notes: "",
      metadata_patch: "",
    },
  });

  const loadTickets = (nextPage: number, reset = false) => {
    startLoading(async () => {
      try {
        const result = await listAdminTicketsAction({
          page: nextPage,
          page_size: 20,
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          category: category === "all" ? undefined : category,
        });
        setRows((prev) => (reset ? result.rows : [...prev, ...result.rows]));
        setHasMore(result.has_more);
        setPage(result.page);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load tickets");
      }
    });
  };

  useEffect(() => {
    loadTickets(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, category]);

  const openResolution = (ticket: TicketRow) => {
    setSelected(ticket);
    form.reset({
      status: ticket.status,
      admin_notes: ticket.admin_notes || "",
      metadata_patch: "",
    });
    setIsOpen(true);
  };

  const onResolve = (values: ResolutionValues) => {
    if (!selected) return;

    startSaving(async () => {
      try {
        const patch = values.metadata_patch?.trim()
          ? (JSON.parse(values.metadata_patch) as Record<string, unknown>)
          : undefined;

        await adminUpdateTicketAction({
          id: selected.id,
          status: values.status,
          admin_notes: values.admin_notes?.trim() || null,
          metadata_patch: patch,
        });

        setRows((prev) =>
          prev.map((row) =>
            row.id === selected.id
              ? {
                  ...row,
                  status: values.status,
                  admin_notes: values.admin_notes?.trim() || null,
                  metadata: {
                    ...(typeof row.metadata === "object" && row.metadata && !Array.isArray(row.metadata) ? row.metadata : {}),
                    ...(patch || {}),
                  } as Json,
                }
              : row
          )
        );
        setIsOpen(false);
        toast.success("Ticket updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update ticket");
      }
    });
  };

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ticket Operations</h2>
          <p className="text-sm text-muted-foreground">Review, prioritize, and resolve incoming platform tickets.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-full min-w-[220px] md:w-[280px]">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search tickets..." />
          </div>
          <Select value={category} onValueChange={(value) => setCategory(value as TicketCategory | "all")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {humanize(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {humanize(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="native-surface surface-pad">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Upvotes</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Resolve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <p className="font-medium">{ticket.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.description}</p>
                </TableCell>
                <TableCell className="capitalize">{humanize(ticket.category)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(ticket.status)}>{humanize(ticket.status)}</Badge>
                </TableCell>
                <TableCell>{ticket.is_public ? "Public" : "Private"}</TableCell>
                <TableCell>{ticket.upvotes}</TableCell>
                <TableCell>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openResolution(ticket)}>
                    Resolve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No tickets found for current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" disabled={isLoading} onClick={() => loadTickets(page + 1)}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Load more
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Update status, add admin notes, and append metadata payload for this ticket.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onResolve)} className="space-y-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {humanize(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} placeholder="Explain resolution or next steps." />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata_patch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata JSON Patch (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder='{"resolved_url": "/exercises/123"}'
                        className="font-mono text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
