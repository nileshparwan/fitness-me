"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCoachPlanTemplates, useCoachToolMutations } from "@/hooks/use-coach-tools";

type SessionDraft = {
  title: string;
  session_type: string;
  notes: string;
  default_slot: "morning" | "afternoon" | "evening" | "other";
  estimated_duration_minutes: number;
};

export function PlanTemplateLibrary() {
  const templatesQuery = useCoachPlanTemplates();
  const mutations = useCoachToolMutations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { title: "Session 1", session_type: "mixed", notes: "", default_slot: "other", estimated_duration_minutes: 60 },
  ]);

  const updateSession = (index: number, patch: Partial<SessionDraft>) => {
    setSessions((current) => current.map((session, currentIndex) => (currentIndex === index ? { ...session, ...patch } : session)));
  };

  const addSession = () => {
    setSessions((current) => [
      ...current,
      {
        title: `Session ${current.length + 1}`,
        session_type: "mixed",
        notes: "",
        default_slot: "other",
        estimated_duration_minutes: 60,
      },
    ]);
  };

  const onCreateTemplate = async () => {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (sessions.length === 0 || sessions.some((session) => !session.title.trim())) {
      toast.error("Each session must include a title.");
      return;
    }

    try {
      await mutations.createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        sessions: sessions.map((session) => ({
          title: session.title.trim(),
          session_type: session.session_type.trim(),
          notes: session.notes.trim() || null,
          default_slot: session.default_slot,
          estimated_duration_minutes: Number(session.estimated_duration_minutes || 0),
        })),
      });
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setSessions([
        { title: "Session 1", session_type: "mixed", notes: "", default_slot: "other", estimated_duration_minutes: 60 },
      ]);
      toast.success("Template created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create template");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Plan Template Library</h1>
          <p className="text-sm text-muted-foreground">
            Create reusable templates and assign client-specific snapshots from them.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Template edits do not change already-assigned client plans.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Name</Label>
                <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sessions</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addSession}>
                    Add Session
                  </Button>
                </div>
                {sessions.map((session, index) => (
                  <div key={index} className="rounded-lg border p-3 space-y-2">
                    <div className="grid gap-2">
                      <Label>Title</Label>
                      <Input value={session.title} onChange={(event) => updateSession(index, { title: event.target.value })} />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Type</Label>
                        <Input
                          value={session.session_type}
                          onChange={(event) => updateSession(index, { session_type: event.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          value={session.estimated_duration_minutes}
                          onChange={(event) =>
                            updateSession(index, { estimated_duration_minutes: Number(event.target.value || 0) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void onCreateTemplate()} disabled={mutations.createTemplate.isPending}>
                {mutations.createTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="native-surface surface-pad space-y-3">
        {templatesQuery.isLoading && !templatesQuery.data ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : null}

        {(templatesQuery.data || []).map((row) => (
          <article key={row.template.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{row.template.name}</h3>
                <p className="text-xs text-muted-foreground">{row.template.description || "No description"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{row.sessions.length} sessions</span>
            </div>
            <ol className="mt-2 list-decimal pl-4 text-sm text-muted-foreground">
              {row.sessions.map((session) => (
                <li key={session.id}>
                  #{session.sequence_no} {session.title} ({session.session_type})
                </li>
              ))}
            </ol>
          </article>
        ))}

        {!templatesQuery.isLoading && (templatesQuery.data || []).length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No templates yet.</div>
        ) : null}
      </section>
    </div>
  );
}

