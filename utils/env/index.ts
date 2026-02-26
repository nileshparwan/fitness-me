import { envSchema } from "./schema";

const parsed = envSchema.safeParse(process.env);

if(!parsed.success) { 
    console.error("❌ Environment variable validation failed:");

    const formatted = parsed.error.format();
    
    for(const key in formatted) {
        if(key === "_errors") continue;

        const field = formatted[key as keyof typeof formatted]; 

        if(field && "_errors" in field) {
            console.error(`- ${key}: ${field._errors.join(", ")}`);
        }
    }

    console.log("Please ensure all required environment variables are set and valid.");

    throw new Error("Invalid environment variables");
}

const env = parsed.data;

const criticalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_AI_KEY: env.OPENAI_AI_KEY,
};

const missingCritical = Object.entries(criticalEnv)
    .filter(([, value]) => !value || String(value).trim().length === 0)
    .map(([key]) => key);

if (missingCritical.length > 0) {
    console.error("❌ Missing critical environment variables:", missingCritical.join(", "));
    throw new Error(`Critical environment variables are missing: ${missingCritical.join(", ")}`);
}

if (process.env.NODE_ENV !== "production") {
    console.log("✅ Environment variables validated");
}
