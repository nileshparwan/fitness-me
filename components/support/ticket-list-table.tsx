"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, Loader2 } from "lucide-react";

import type { TicketCategory, TicketListRow, TicketStatus } from "@/app/actions/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getStatusClass(status: TicketStatus) {
  if (status === "resolved") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "closed") return "border-border bg-muted text-muted-foreground";
  if (status === "in_progress") return "border-secondary/40 bg-secondary/20 text-secondary-foreground";
  return "border-primary/30 bg-primary/15 text-primary";
}

function getCategoryClass(category: TicketCategory) {
  if (category === "bug_report") return "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (category === "feature_request") return "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (category === "exercise_request") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function humanizeCategory(category: TicketCategory) {
  return category.replaceAll("_", " ");
}

interface TicketListTableProps {
  rows: Array<TicketListRow | null | undefined>;
  mode: "public" | "mine";
  isLoading: boolean;
  emptyText: string;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  onUpvote?: (ticketId: string) => void;
  upvotingId?: string | null;
}

export function TicketListTable({
  rows,
  mode,
  isLoading,
  emptyText,
  hasMore,
  onLoadMore,
  loadingMore,
  onUpvote,
  upvotingId,
}: TicketListTableProps) {
  const safeRows = Array.isArray(rows)
    ? rows.filter((ticket): ticket is TicketListRow => Boolean(ticket && ticket.id))
    : [];

  return (
    <div className="space-y-3">
      <div className="space-y-2 md:hidden">
        {isLoading && safeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading tickets...</p>
        ) : null}
        {!isLoading && safeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : null}
        {safeRows.map((ticket) => (
          <div key={ticket.id} className="rounded-lg border bg-card/90 p-3 transition-colors hover:bg-primary/5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/support/${ticket.id}`} className="truncate text-sm font-medium hover:underline">
                  {ticket.title}
                </Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.description}</p>
              </div>
              <Badge className={`shrink-0 text-[10px] ${getStatusClass(ticket.status)}`}>
                {ticket.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={`capitalize ${getCategoryClass(ticket.category)}`}>
                {humanizeCategory(ticket.category)}
              </Badge>
              <span>{ticket.is_public ? "Public" : "Private"}</span>
              <span>{ticket.upvotes} upvotes</span>
              <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
            </div>
            {mode === "public" && onUpvote ? (
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => onUpvote(ticket.id)} disabled={upvotingId === ticket.id}>
                  {upvotingId === ticket.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className={`mr-1 h-3.5 w-3.5 ${ticket.viewer_has_upvoted ? "fill-current" : ""}`} />
                  )}
                  {ticket.viewer_has_upvoted ? "Upvoted" : "Upvote"}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 text-xs">Ticket</TableHead>
              <TableHead className="hidden py-2 text-xs lg:table-cell">Category</TableHead>
              <TableHead className="py-2 text-xs">Status</TableHead>
              <TableHead className="py-2 text-xs">Upvotes</TableHead>
              <TableHead className="hidden py-2 text-xs xl:table-cell">Updated</TableHead>
              <TableHead className="py-2 text-right text-xs">{mode === "public" ? "Action" : "Visibility"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.map((ticket) => (
              <TableRow key={ticket.id} className="color-hover-row">
                <TableCell className="py-2">
                  <Link href={`/support/${ticket.id}`} className="text-sm font-medium hover:underline">
                    {ticket.title}
                  </Link>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{ticket.description}</p>
                </TableCell>
                <TableCell className="hidden py-2 capitalize text-xs lg:table-cell">
                  <Badge variant="outline" className={getCategoryClass(ticket.category)}>
                    {humanizeCategory(ticket.category)}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <Badge className={`text-[10px] ${getStatusClass(ticket.status)}`}>
                    {ticket.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-xs">{ticket.upvotes}</TableCell>
                <TableCell className="hidden py-2 text-xs text-muted-foreground xl:table-cell">
                  {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="py-2 text-right">
                  {mode === "public" && onUpvote ? (
                    <Button
                      size="sm"
                      variant={ticket.viewer_has_upvoted ? "default" : "outline"}
                      onClick={() => onUpvote(ticket.id)}
                      disabled={upvotingId === ticket.id}
                    >
                      {upvotingId === ticket.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowUp className={`mr-1 h-3.5 w-3.5 ${ticket.viewer_has_upvoted ? "fill-current" : ""}`} />
                      )}
                      {ticket.viewer_has_upvoted ? "Upvoted" : "Upvote"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{ticket.is_public ? "Public" : "Private"}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && safeRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button size="sm" variant="outline" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
