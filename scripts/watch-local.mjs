import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

// Load .env.local manually
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
const POLL_INTERVAL_MS = 10000; // Check every 10 seconds

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function syncAndClean() {
  const { data: files, error } = await supabase.storage.from("voicenotes").list();
  if (error || !files) {
    if (error) console.error("Error listing storage files:", error.message);
    return;
  }

  const webmFiles = files.filter(f => f.name.endsWith(".webm"));
  if (webmFiles.length === 0) return;

  console.log(`[${new Date().toLocaleTimeString()}] Found ${webmFiles.length} new voice note(s)...`);

  for (const file of webmFiles) {
    const dateObj = file.created_at ? new Date(file.created_at) : new Date();
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dateDir = path.join(TARGET_DIR, dateStr);

    try {
      await fs.mkdir(dateDir, { recursive: true });
    } catch {}

    const localPath = path.join(dateDir, file.name);

    // 1. Download file content
    const { data, error: dlError } = await supabase.storage.from("voicenotes").download(file.name);
    if (dlError || !data) {
      console.error(`  ❌ Failed to download ${file.name}:`, dlError?.message);
      continue;
    }

    // 2. Save locally
    const arrayBuffer = await data.arrayBuffer();
    await fs.writeFile(localPath, Buffer.from(arrayBuffer));

    // 3. Verify file saved on disk
    const stat = await fs.stat(localPath);
    if (stat.size > 0) {
      // 4. Delete from Supabase cloud storage
      const { error: rmError } = await supabase.storage.from("voicenotes").remove([file.name]);
      if (rmError) {
        console.error(`  ⚠️ Saved locally, but failed to delete from cloud: ${file.name}`);
      } else {
        console.log(`  ✅ Moved to ${dateStr}\\${file.name} & deleted from cloud.`);
      }
    }
  }
}

async function startWatcher() {
  console.log("==========================================");
  console.log(` 🎙 TikTok UGC Auto-Watcher Active`);
  console.log(` 📂 Target Folder: ${TARGET_DIR}`);
  console.log(` ⏱  Polling Interval: Every 10s`);
  console.log("==========================================\n");

  await syncAndClean();

  setInterval(async () => {
    try {
      await syncAndClean();
    } catch (err) {
      console.error("Watcher error:", err);
    }
  }, POLL_INTERVAL_MS);
}

startWatcher().catch(console.error);
