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

if (process.env.NODE_ENV !== "production") {
    console.log("✅ Environment variables validated");
}