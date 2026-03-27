// src/env/schema.ts
import { z } from "zod";

export const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),

    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    VAPID_SUBJECT: z.string().min(1),

    VAPID_PUBLIC_KEY: z.string().min(1),

    VAPID_PRIVATE_KEY: z.string().min(1),

    OPENAI_AI_MODEL: z.string().min(1),

    OPENAI_AI_KEY: z.string().min(1),

    OPENAI_AI_URL: z.url(),

    INNGEST_EVENT_KEY: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;
