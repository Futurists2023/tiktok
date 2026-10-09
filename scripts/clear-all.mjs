import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";

// Load .env.local
try {
  const envContent = await fs.readFile(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function purgeAll() {
  console.log("Fetching files from Supabase Storage bucket 'voicenotes'...");
  const { data: files, error } = await supabase.storage.from("voicenotes").list();

  if (error) {
    console.error("Error listing files:", error.message);
    process.exit(1);
  }

  if (!files || files.length === 0) {
    console.log("Bucket is already empty! 0 files found.");
    return;
  }

  const filenames = files.map(f => f.name);
  console.log(`Deleting ${filenames.length} file(s) from cloud...`);

  const { data, error: rmError } = await supabase.storage.from("voicenotes").remove(filenames);

  if (rmError) {
    console.error("Failed to delete files:", rmError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully purged ${data.length} file(s) from Supabase cloud!`);
}

purgeAll().catch(console.error);
