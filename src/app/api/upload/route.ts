import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No audio file found" }, { status: 400 });
    }
    
    // Generate a unique filename using timestamp and random string
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const filename = `${Date.now()}_${uniqueId}.webm`;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase.storage
      .from("voicenotes")
      .upload(filename, file, {
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
