"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { updateProfile, type SettingsProfilePayload } from "@/app/actions/settings";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { profileSchema, type ProfileFormValues } from "@/lib/validations/settings";
import { compressToBase64, dataUrlSizeBytes } from "@/utils/image";

type ProfileSettingsFormProps = {
  profile: SettingsProfilePayload;
};

const GENDER_OPTIONS: Array<{ value: NonNullable<ProfileFormValues["gender"]>; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const FITNESS_LEVEL_OPTIONS: Array<{ value: NonNullable<ProfileFormValues["fitness_level"]>; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "athlete", label: "Athlete" },
];

const COACH_SPECIALTY_OPTIONS: Array<{ value: NonNullable<ProfileFormValues["coach_specialty"]>; label: string }> = [
  { value: "general_fitness", label: "General Fitness" },
  { value: "strength_and_conditioning", label: "Strength & Conditioning" },
  { value: "weight_management", label: "Weight Management" },
  { value: "womens_health", label: "Women's Health" },
  { value: "prenatal_and_postnatal", label: "Prenatal & Postnatal" },
  { value: "yoga_and_pilates", label: "Yoga & Pilates" },
  { value: "endurance_and_running", label: "Endurance & Running" },
  { value: "sport_specific", label: "Sport Specific" },
  { value: "rehabilitation", label: "Rehabilitation" },
];

function ProfileAvatarUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [isConverting, setIsConverting] = useState(false);
  const previewBytes = dataUrlSizeBytes(value);

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
      <FormLabel>Profile Photo <span className="text-muted-foreground">(optional)</span></FormLabel>
      {value ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Profile photo" className="h-16 w-16 rounded-full object-cover ring-2 ring-border/50" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Photo uploaded</p>
            {previewBytes > 0 ? <p className="text-xs text-muted-foreground">Photo saved ({Math.round(previewBytes / 1000)} KB)</p> : null}
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={() => onChange(null)}
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : null}
      <Dropzone
        onDrop={handleFiles}
        accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
        maxFiles={1}
        maxSize={5 * 1024 * 1024}
        disabled={isConverting}
        onError={(message) => toast.error(message)}
      />
      {isConverting ? <p className="text-xs text-muted-foreground">Processing...</p> : null}
    </div>
  );
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    defaultValues: {
      full_name: profile.full_name || "",
      phone: profile.phone || null,
      date_of_birth: profile.date_of_birth || null,
      bio: profile.bio || null,
      avatar_url: profile.avatar_url || null,
      gender: profile.gender || null,
      fitness_level: profile.fitness_level || null,
      coach_specialty: profile.coach_specialty || null,
      is_pregnant: profile.is_pregnant || false,
      due_date: profile.due_date || null,
      is_postpartum: profile.is_postpartum || false,
      postpartum_since: profile.postpartum_since || null,
    },
  });
  const roleIsCoach = profile.role === "sysadmin";

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      const result = await withToastFeedback(updateProfile(values), {
        loading: "Updating profile...",
        success: "Profile saved",
        error: "Unable to save profile",
      }).catch(() => null);
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ["user"] });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="native-surface surface-pad stack-gap">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Profile Information</h3>
            <p className="text-sm text-muted-foreground">Manage your public profile and contact details.</p>
          </div>

          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input disabled value={profile.email || ""} className="bg-muted text-muted-foreground" />
            </FormControl>
          </FormItem>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Full name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value || ""}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      placeholder="+1 555 123 4567"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <FormLabel>Gender</FormLabel>
            <RadioGroup
              value={form.watch("gender") ?? undefined}
              onValueChange={(value) =>
                form.setValue("gender", value as ProfileFormValues["gender"], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4"
            >
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-3 text-left text-sm transition hover:border-primary/30"
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">{option.label}</div>
                    <div className="text-xs text-muted-foreground">Used for suggestions and health insights.</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fitness_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Level</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value || null)} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fitness level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FITNESS_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {roleIsCoach ? (
              <FormField
                control={form.control}
                name="coach_specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coach Specialty</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value || null)} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COACH_SPECIALTY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          <div className="grid gap-4 rounded-2xl border border-border/60 bg-background/40 p-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="is_pregnant"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-3">
                    <div className="space-y-1">
                      <FormLabel>Currently Pregnant</FormLabel>
                      <p className="text-xs text-muted-foreground">Shows prenatal guidance and due-date context.</p>
                    </div>
                    <FormControl>
                      <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_postpartum"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-3">
                    <div className="space-y-1">
                      <FormLabel>Postpartum</FormLabel>
                      <p className="text-xs text-muted-foreground">Used for return-to-training guidance.</p>
                    </div>
                    <FormControl>
                      <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postpartum_since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postpartum Since</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    maxLength={160}
                    placeholder="Tell us a little about yourself"
                    className="resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <ProfileAvatarUpload value={field.value ?? null} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-0 h-4 w-4 animate-spin sm:mr-2" /> : <Save className="mr-0 h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">{isPending ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </section>
      </form>
    </Form>
  );
}
