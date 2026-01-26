"use server";

import { inngest } from "@/lib/inngest/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadProgressPhoto(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("photo") as File;
  if (!file) throw new Error("No file uploaded");

  // 2. Upload to Supabase Storage
  // We use a unique path: users/{userId}/{timestamp}.jpg
  const filePath = `users/${user.id}/${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(filePath, file);

  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  // 3. Create Queue Record (Pending State)
  const { data: queueItem, error: dbError } = await supabase
    .from("ai_processing_queue")
    .insert({
      user_id: user.id,
      input_image_url: filePath, // Storing the path, not full URL
      task_type: "analyze_physique",
      status: "pending"
    })
    .select()
    .single();

  if (dbError) throw new Error("Database error: " + dbError.message);

  // 4. Trigger Inngest
  await inngest.send({
    name: "ai/analyze.photo",
    data: {
      queueId: queueItem.id,
      userId: user.id,
      imageUrl: filePath,
    },
  });

  revalidatePath("/progress/body");
  redirect("/progress/body?success=true");
}