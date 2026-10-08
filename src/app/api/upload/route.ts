import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No audio file found" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create data/uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    // Generate a unique filename using timestamp and random string
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const filename = `${Date.now()}_${uniqueId}.webm`;
    const filePath = path.join(uploadDir, filename);
    
    await writeFile(filePath, buffer);
    
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
