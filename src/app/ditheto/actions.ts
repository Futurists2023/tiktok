"use server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";

export async function deleteNotes(filenames: string[]) {
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

  revalidatePath("/ditheto");
  revalidatePath("/inbox");
  
  return { success: true };
}

export async function saveToLocalDir(files: { filename: string, createdAt: number }[], targetDir = "B:\\tiktok-ugc") {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: "Supabase credentials not configured." };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (err) {
    return { error: `Could not access target directory ${targetDir}: ${(err as Error).message}` };
  }

  let savedCount = 0;
  for (const file of files) {
    const dateObj = new Date(file.createdAt);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dateDir = path.join(/*turbopackIgnore: true*/ targetDir, dateStr);

    try {
      await fs.mkdir(dateDir, { recursive: true });
    } catch (err) {
      // Ignore
    }

    const filePath = path.join(/*turbopackIgnore: true*/ dateDir, file.filename);

    try {
      await fs.access(filePath);
      continue; // File already exists locally, skip
    } catch {
      // File missing, proceed with download
    }

    const { data, error } = await supabase.storage.from("voicenotes").download(file.filename);
    if (error || !data) {
      console.error(`Error downloading ${file.filename}:`, error);
      continue;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);
    savedCount++;
  }

  return { success: true, savedCount, targetDir };
}
