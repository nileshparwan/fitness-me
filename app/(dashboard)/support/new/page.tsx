"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { type TicketCategory } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTicket } from "@/hooks/use-tickets";

const submissionSchema = z.object({
  category: z.enum(["exercise_request", "feature_request", "bug_report", "other"]),
  title: z.string().trim().min(3, "Title must have at least 3 characters").max(160),
  description: z.string().trim().min(10, "Description must have at least 10 characters").max(4000),
});

type SubmissionValues = z.infer<typeof submissionSchema>;

const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
  { value: "exercise_request", label: "Exercise Request" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
  { value: "other", label: "Other" },
];

export default function SupportNewTicketPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const createTicket = useCreateTicket();

  const form = useForm<SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      category: "feature_request",
      title: "",
      description: "",
    },
  });

  const onSubmit = (values: SubmissionValues) => {
    startTransition(async () => {
      try {
        await createTicket.mutateAsync({
          ...values,
          is_public: values.category === "bug_report" ? false : true,
        });
        toast.success("Ticket submitted successfully!");
        router.push("/support");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to submit ticket");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-20 pt-4 md:space-y-6 md:px-6 md:pb-8 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/support">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Support
          </Link>
        </Button>
      </div>

      <section className="native-surface surface-pad space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Submit a Ticket</h1>
          <p className="text-sm text-muted-foreground">
            Send an exercise request, feature suggestion, or bug report.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value === "bug_report" ? (
                    <p className="text-xs text-muted-foreground">Bug reports are private by default.</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Short, specific summary" className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[160px]"
                      placeholder="Add context, expected behavior, and why this matters."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || createTicket.isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Ticket
              </Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
