"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { flattenWorkoutExecutionSubjectPages, useLogWorkoutExecutionMutation, useWorkoutExecutionSubjects } from "@/hooks/use-workout";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toDateInput } from "@/lib/utils/date";

interface LogWorkoutDialogProps {
  workoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogWorkoutDialog({ workoutId, open, onOpenChange }: LogWorkoutDialogProps) {
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("self");
  const [selectedSubjectName, setSelectedSubjectName] = useState("Myself");
  const [performedOn, setPerformedOn] = useState(toDateInput(new Date()));
  const [logNotes, setLogNotes] = useState("");

  const logExecution = useLogWorkoutExecutionMutation();
  const subjectQuery = useWorkoutExecutionSubjects(subjectSearch, open);
  const subjectOptions = useMemo(
    () => flattenWorkoutExecutionSubjectPages(subjectQuery.data),
    [subjectQuery.data]
  );

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSelectedSubjectId("self");
      setSelectedSubjectName("Myself");
      setSubjectSearch("");
      setPerformedOn(toDateInput(new Date()));
      setLogNotes("");
      setSubjectDropdownOpen(false);
    }
  }

  async function handleSubmit() {
    await withToastFeedback(
      logExecution.mutateAsync({
        workout_id: workoutId,
        subject_client_id: selectedSubjectId === "self" ? null : selectedSubjectId,
        performed_on: performedOn,
        notes: logNotes.trim() || null,
      }),
      {
        loading: "Logging workout...",
        success: "Workout logged",
        error: "Unable to log workout",
      }
    );
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size={{ tablet: "md", desktop: "md" }} className="gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Log Workout Execution</DialogTitle>
          <DialogDescription>
            Record that this workout was performed today. This drives adherence and streak tracking.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <Label>Performed For</Label>
            <Popover open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                >
                  <span className="truncate">{selectedSubjectName}</span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border-border/70 bg-card/95 p-2"
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={subjectSearch}
                      onChange={(event) => setSubjectSearch(event.target.value)}
                      placeholder="Search clients..."
                      className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
                    />
                  </div>

                  <ScrollArea className="max-h-[260px] pr-2">
                    <div className="space-y-1">
                      {subjectQuery.isLoading ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
                      ) : subjectOptions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
                      ) : (
                        subjectOptions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/40"
                            onClick={() => {
                              setSelectedSubjectId(item.id);
                              setSelectedSubjectName(item.full_name || (item.is_self ? "Myself" : "Client"));
                              setSubjectDropdownOpen(false);
                            }}
                          >
                            <span className="truncate">{item.full_name || "Client"}</span>
                            <span className="text-[11px] text-muted-foreground">{item.is_self ? "self" : "client"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {subjectQuery.hasNextPage ? (
                    <Button
                      variant="outline"
                      className="h-9 w-full rounded-lg border-border/60 bg-muted/20"
                      onClick={() => void subjectQuery.fetchNextPage()}
                      disabled={subjectQuery.isFetchingNextPage}
                    >
                      {subjectQuery.isFetchingNextPage ? (
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

          <div className="space-y-2">
            <Label htmlFor="execution-performed-on">Performed On</Label>
            <Input
              id="execution-performed-on"
              type="date"
              value={performedOn}
              onChange={(event) => setPerformedOn(event.target.value)}
              className="h-11 rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="execution-notes">Notes</Label>
            <Textarea
              id="execution-notes"
              rows={3}
              value={logNotes}
              onChange={(event) => setLogNotes(event.target.value)}
              placeholder="Optional notes"
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>
        </div>
        <DialogFooter className="border-t border-border/60 px-5 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="accent-strong text-black"
            onClick={() => void handleSubmit()}
            disabled={logExecution.isPending || !performedOn}
          >
            {logExecution.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging...
              </span>
            ) : (
              "Log Today"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
