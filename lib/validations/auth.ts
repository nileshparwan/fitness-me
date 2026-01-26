import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const registerSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
});

// Create a union type for our form
export type AuthFormValues = z.infer<typeof registerSchema>;