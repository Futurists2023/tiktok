import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, props: { params: Promise<{ filename: string }> }) {
  const params = await props.params;
  const filename = params.filename;
  
  if (!filename) {
    return new NextResponse("Filename is required", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "uploads", filename);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/webm",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return new NextResponse("File not found or unreadable", { status: 404 });
  }
}
