import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { inngest } from "../client";

type ClientRow = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "linked_user_id" | "display_name" | "first_name" | "last_name"
>;

type ResolvedRecipient = {
  recipientId: string;
  clientName: string;
};

function coalesceClientName(input: {
  profileName: string | null | undefined;
  displayName: string | null | undefined;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
}) {
  const profile = input.profileName?.trim();
  if (profile) return profile;
  const display = input.displayName?.trim();
  if (display) return display;
  const joined = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ").trim();
  return joined;
}

export const notifyCheckinSubmitted = inngest.createFunction(
  {
    id: "notify-checkin-submitted",
    concurrency: {
      limit: 10,
    },
  },
  { event: "coaching/checkin.submitted" },
  async ({ event, step }) => {
    const admin = createAdminClient();

    const recipient = await step.run("resolve-recipient", async (): Promise<ResolvedRecipient | null> => {
      if (event.data.subject_user_id) {
        return { recipientId: event.data.subject_user_id, clientName: "" };
      }

      if (!event.data.subject_client_id) return null;

      const { data: client, error: clientError } = await admin
        .from("clients")
        .select("id, linked_user_id, display_name, first_name, last_name")
        .eq("id", event.data.subject_client_id)
        .maybeSingle();
      if (clientError) throw new Error(clientError.message);
      const typedClient = client as ClientRow;
      const recipientId = typedClient.linked_user_id;
      if (!recipientId) return null;
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", recipientId)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);

      return {
        recipientId,
        clientName: coalesceClientName({
          profileName: profile?.full_name,
          displayName: typedClient.display_name,
          firstName: typedClient.first_name,
          lastName: typedClient.last_name,
        }),
      };
    });

    if (!recipient) {
      return {
        notified: false,
        reason: "no-recipient",
      };
    }

    await step.run("create-notification", async () => {
      const { error } = await admin.from("notifications").insert({
        user_id: recipient.recipientId,
        type: "checkin_submitted",
        title: "Check-in recorded",
        body: "Your coach has recorded a new check-in for you.",
        data: {
          checkin_id: event.data.checkin_id,
          client_id: event.data.subject_client_id ?? null,
          client_name: recipient.clientName,
        },
      });
      if (error) throw new Error(error.message);
    });

    return {
      notified: true,
      recipient_id: recipient.recipientId,
    };
  }
);
