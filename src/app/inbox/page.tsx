import { createClient } from "@supabase/supabase-js";

export const instant = false;

interface VoiceNote {
  filename: string;
  createdAt: number;
  size: number;
  url: string;
}

async function getVoiceNotes(): Promise<VoiceNote[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data, error } = await supabase.storage
    .from("voicenotes")
    .list();
    
  if (error || !data) {
    console.error("Error listing files:", error);
    return [];
  }
  
  const voiceNotes: VoiceNote[] = data
    .filter(file => file.name.endsWith('.webm'))
    .map(file => {
      const { data: urlData } = supabase.storage.from("voicenotes").getPublicUrl(file.name);
      return {
        filename: file.name,
        createdAt: new Date(file.created_at).getTime(),
        size: file.metadata?.size || 0,
        url: urlData.publicUrl,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
    
  return voiceNotes;
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
                    <audio controls src={note.url} />
                  </div>
                  
                  <div className="inbox-actions">
                    <a href={note.url} download className="btn-download" target="_blank" rel="noopener noreferrer">
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
