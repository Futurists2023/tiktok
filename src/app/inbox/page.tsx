import { readdir, stat } from "fs/promises";
import path from "path";
export const instant = false;

interface VoiceNote {
  filename: string;
  createdAt: number;
  size: number;
}

async function getVoiceNotes(): Promise<VoiceNote[]> {
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  try {
    const files = await readdir(uploadDir);
    const voiceNotes: VoiceNote[] = [];

    for (const file of files) {
      if (file.endsWith(".webm")) {
        const filePath = path.join(uploadDir, file);
        const fileStat = await stat(filePath);
        voiceNotes.push({
          filename: file,
          createdAt: fileStat.mtimeMs,
          size: fileStat.size,
        });
      }
    }

    return voiceNotes.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    // Directory might not exist yet
    return [];
  }
}

export default async function Inbox() {
  const notes = await getVoiceNotes();

  return (
    <main className="container">
      <div className="glass-panel">
        <h1 className="title" style={{ textAlign: "left", marginBottom: "0" }}>Creator Inbox</h1>
        <p className="subtitle" style={{ textAlign: "left", marginBottom: "1.5rem" }}>
          Anonymous Voice Notes
        </p>

        {notes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <p>No voice notes yet.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Share your link to start collecting.</p>
          </div>
        ) : (
          <div className="inbox-list">
            {notes.map((note) => {
              const date = new Date(note.createdAt);
              return (
                <div key={note.filename} className="inbox-item">
                  <div className="inbox-header">
                    <span>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{(note.size / 1024).toFixed(1)} KB</span>
                  </div>
                  
                  <div className="audio-preview" style={{ marginTop: "0.5rem" }}>
                    <audio controls src={`/api/audio/${note.filename}`} />
                  </div>
                  
                  <div className="inbox-actions">
                    <a href={`/api/audio/${note.filename}`} download className="btn-download">
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
