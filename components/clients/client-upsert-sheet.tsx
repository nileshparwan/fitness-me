"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { ClientStatus } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSheet, AppSheetContent, AppSheetDescription, AppSheetFooter, AppSheetHeader, AppSheetTitle } from "@/components/ui/app-sheet";
import { Switch } from "@/components/ui/switch";
import { useClientDetail, useCoachToolMutations } from "@/hooks/use-coach-tools";
import type { Database } from "@/types/database";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { compressToBase64, dataUrlSizeBytes } from "@/utils/image";
import { cn } from "@/utils";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

type ClientUpsertSheetProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (clientId: string) => void;
  prefill?: Partial<ClientRow> | null;
};

const CLIENT_STATUS_OPTIONS: ClientStatus[] = ["active", "paused", "blocked", "archived"];
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;
const FITNESS_LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "athlete", label: "Athlete" },
] as const;

const clientFormSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1, "First name is required").max(120),
  last_name: z.string().trim().max(120).nullable().optional(),
  display_name: z.string().trim().max(180).nullable().optional(),
  email: z.string().trim().email("Enter a valid email").nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(40).nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  status: z.enum(CLIENT_STATUS_OPTIONS),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).nullable().optional(),
  fitness_level: z.enum(["beginner", "intermediate", "advanced", "athlete"]).nullable().optional(),
  is_pregnant: z.boolean().default(false),
  due_date: z.string().date().nullable().optional(),
  is_postpartum: z.boolean().default(false),
  postpartum_since: z.string().date().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function toNullableString(value?: string | null) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildFormValues(source?: Partial<ClientRow> | null): ClientFormValues {
  return {
    id: source?.id,
    first_name: source?.first_name || "",
    last_name: source?.last_name || null,
    display_name: source?.display_name || null,
    email: source?.email || null,
    phone: source?.phone || null,
    date_of_birth: source?.date_of_birth || null,
    status: (source?.status as ClientStatus | undefined) || "active",
    gender: source?.gender || null,
    fitness_level: source?.fitness_level || null,
    is_pregnant: source?.is_pregnant || false,
    due_date: source?.due_date || null,
    is_postpartum: source?.is_postpartum || false,
    postpartum_since: source?.postpartum_since || null,
    avatar_url: source?.avatar_url || null,
  };
}

function ClientAvatarUpload({
  value,
  resolvedAvatarUrl,
  onChange,
}: {
  value: string | null;
  resolvedAvatarUrl: string | null;
  onChange: (nextValue: string | null) => void;
}) {
  const [isConverting, setIsConverting] = useState(false);
  const preview = value ?? resolvedAvatarUrl;
  const previewBytes = dataUrlSizeBytes(preview);
  const previewLabel = value ? "Custom photo saved" : resolvedAvatarUrl ? "Using linked profile photo" : null;

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsConverting(true);
    try {
      const base64 = await compressToBase64(file);
      onChange(base64);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image processing failed.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Profile Photo</Label>
      {preview ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Client avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-border/50" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">{previewLabel || "Photo uploaded"}</p>
            {previewBytes > 0 ? <p className="text-xs text-muted-foreground">Photo saved ({Math.round(previewBytes / 1000)} KB)</p> : null}
            {value ? (
              <button type="button" className="text-xs text-destructive hover:underline" onClick={() => onChange(null)}>
                Remove custom photo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <Dropzone
        onDrop={handleFiles}
        onError={(message) => toast.error(message)}
        accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
        maxFiles={1}
        maxSize={5 * 1024 * 1024}
        disabled={isConverting}
      />
      {isConverting ? <p className="text-xs text-muted-foreground">Processing image...</p> : null}
    </div>
  );
}

export function ClientUpsertSheet({ open, onClose, onSaved, prefill }: ClientUpsertSheetProps) {
  const mutations = useCoachToolMutations();
  const isEditing = Boolean(prefill?.id);
  const detailQuery = useClientDetail(prefill?.id || "", { enabled: open && Boolean(prefill?.id) });
  const hydratedClient = detailQuery.data?.client;
  const resolvedAvatarUrl = detailQuery.data?.resolved_avatar_url ?? null;
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema) as Resolver<ClientFormValues>,
    defaultValues: buildFormValues(prefill),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildFormValues(hydratedClient || prefill || null));
  }, [form, hydratedClient, open, prefill]);

  const isPregnant = form.watch("is_pregnant");
  const isPostpartum = form.watch("is_postpartum");

  const submit = form.handleSubmit(async (values) => {
    const result = await withToastFeedback(
      mutations.upsertClient.mutateAsync({
        id: values.id,
        first_name: values.first_name.trim(),
        last_name: toNullableString(values.last_name),
        display_name: toNullableString(values.display_name),
        email: toNullableString(values.email),
        phone: toNullableString(values.phone),
        date_of_birth: values.date_of_birth || null,
        status: values.status,
        gender: values.gender ?? null,
        fitness_level: values.fitness_level ?? null,
        is_pregnant: values.is_pregnant,
        due_date: values.is_pregnant ? values.due_date || null : null,
        is_postpartum: values.is_postpartum,
        postpartum_since: values.is_postpartum ? values.postpartum_since || null : null,
        avatar_url: values.avatar_url ?? null,
      }),
      {
        loading: isEditing ? "Updating client..." : "Creating client...",
        success: isEditing ? "Client updated" : "Client created",
        error: "Unable to save client",
      }
    ).catch(() => null);

    if (!result) return;
    onSaved(result.id);
    onClose();
  });

  return (
    <AppSheet open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <AppSheetContent size="xl" className="gap-0 px-0">
        <AppSheetHeader className="border-b border-border/60 px-5 py-4">
          <AppSheetTitle>{isEditing ? "Edit Client" : "New Client"}</AppSheetTitle>
          <AppSheetDescription>{isEditing ? "Update client details." : "Create a client profile."}</AppSheetDescription>
        </AppSheetHeader>

        {isEditing && detailQuery.isLoading && !detailQuery.data ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading client details...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={submit} className="space-y-6 px-5 py-4">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Identity</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="display_name" render={({ field }) => (
                    <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} placeholder="Optional display name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={(value) => field.onChange(value as ClientStatus)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{CLIENT_STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} placeholder="Optional email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} placeholder="Optional phone" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} /></FormControl><FormMessage /></FormItem>
                )} />
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Health Profile</h3>
                </div>
                <FormField control={form.control} name="avatar_url" render={({ field }) => (
                  <ClientAvatarUpload value={field.value ?? null} resolvedAvatarUrl={resolvedAvatarUrl} onChange={field.onChange} />
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Gender</FormLabel><FormControl><RadioGroup value={field.value ?? undefined} onValueChange={(value) => field.onChange(value)} className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{GENDER_OPTIONS.map((option) => <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-3 text-left text-sm transition hover:border-primary/30"><RadioGroupItem value={option.value} className="mt-0.5" /><div><div className="font-medium text-foreground">{option.label}</div><div className="text-xs text-muted-foreground">Used for planning context.</div></div></label>)}</RadioGroup></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fitness_level" render={({ field }) => (
                  <FormItem><FormLabel>Fitness Level</FormLabel><Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value || null)}><FormControl><SelectTrigger><SelectValue placeholder="Select fitness level" /></SelectTrigger></FormControl><SelectContent>{FITNESS_LEVEL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </section>

              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pregnancy & Postpartum</h3>
                </div>
                <FormField control={form.control} name="is_pregnant" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-4 py-3"><div><FormLabel>Currently Pregnant</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} disabled={!isPregnant} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="is_postpartum" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-4 py-3"><div><FormLabel>Postpartum</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="postpartum_since" render={({ field }) => (
                  <FormItem><FormLabel>Postpartum Since</FormLabel><FormControl><Input type="date" value={field.value || ""} onChange={(event) => field.onChange(event.target.value || null)} disabled={!isPostpartum} /></FormControl><FormMessage /></FormItem>
                )} />
              </section>
              <AppSheetFooter className="border-t border-border/60 px-0 pt-4">
                <Button type="button" variant="outline" className="rounded-xl border-border/60" onClick={onClose}>Cancel</Button>
                <Button type="submit" className={cn("accent-strong rounded-xl text-black")} disabled={mutations.upsertClient.isPending || (isEditing && detailQuery.isLoading && !detailQuery.data)}>
                  {mutations.upsertClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </AppSheetFooter>
            </form>
          </Form>
        )}
      </AppSheetContent>
    </AppSheet>
  );
}
