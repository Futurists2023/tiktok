import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

// Load .env.local manually without dotenv dependency
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
} catch (e) {
  // .env.local optional
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TARGET_DIR = "B:\\tiktok-ugc";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function sync() {
  console.log(`Checking Supabase Storage ('voicenotes') -> ${TARGET_DIR}...`);
  await fs.mkdir(TARGET_DIR, { recursive: true });

  const { data: files, error } = await supabase.storage.from("voicenotes").list();
  if (error || !files) {
    console.error("Error listing files from Supabase:", error);
    process.exit(1);
  }

  const webmFiles = files.filter(f => f.name.endsWith(".webm"));
  console.log(`Found ${webmFiles.length} file(s) in Supabase Storage.`);

  let downloaded = 0;
  for (const file of webmFiles) {
    const dateObj = file.created_at ? new Date(file.created_at) : new Date();
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dateDir = path.join(TARGET_DIR, dateStr);

    try {
      await fs.mkdir(dateDir, { recursive: true });
    } catch { }

    const localPath = path.join(dateDir, file.name);
    try {
      await fs.access(localPath);
      // File already exists locally
    } catch {
      // File missing, download
      process.stdout.write(`Downloading ${file.name} to ${dateStr}... `);
      const { data, error: dlError } = await supabase.storage.from("voicenotes").download(file.name);
      if (dlError || !data) {
        console.log(`FAILED: ${dlError?.message || "No data"}`);
        continue;
      }
      const arrayBuffer = await data.arrayBuffer();
      await fs.writeFile(localPath, Buffer.from(arrayBuffer));
      console.log("DONE");
      downloaded++;
    }
  }

  console.log(`\nSync complete! Downloaded ${downloaded} new file(s) to ${TARGET_DIR}.`);
}

sync().catch(err => {
  console.error("Sync error:", err);
  process.exit(1);
});
