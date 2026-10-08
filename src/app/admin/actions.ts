"use server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteNotes(filenames: string[], password: string) {
  const correctPassword = process.env.ADMIN_PASSWORD;
  
  if (!correctPassword || password !== correctPassword) {
    return { error: "Invalid admin password" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: "Supabase service role key is not configured for deletion." };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase.storage.from("voicenotes").remove(filenames);

  if (error) {
    console.error("Delete error:", error);
    return { error: "Failed to delete files from storage" };
  }

  revalidatePath("/admin");
  revalidatePath("/inbox");
  
  return { success: true };
}
