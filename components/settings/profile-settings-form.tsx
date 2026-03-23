"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateProfile, type SettingsProfilePayload } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { profileSchema, type ProfileFormValues } from "@/lib/validations/settings";

type ProfileSettingsFormProps = {
  profile: SettingsProfilePayload;
};

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name || "",
      phone: profile.phone || null,
      date_of_birth: profile.date_of_birth || null,
      bio: profile.bio || null,
      avatar_url: profile.avatar_url || null,
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      await withToastFeedback(updateProfile(values), {
        loading: "Updating profile...",
        success: "Profile saved",
        error: "Unable to save profile",
      }).catch(() => null);
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
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    placeholder="https://..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </section>
      </form>
    </Form>
  );
}
