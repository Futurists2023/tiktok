"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { deleteNotes, saveToLocalDir } from "./actions";

interface VoiceNote {
  filename: string;
  createdAt: number;
  size: number;
  url: string;
}

export default function DithetoPage() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase.storage.from("voicenotes").list();
    if (!error && data) {
      const voiceNotes = data
        .filter(file => file.name.endsWith(".webm"))
        .map(file => {
          const { data: urlData } = supabase.storage.from("voicenotes").getPublicUrl(file.name);
          return {
            filename: file.name,
            createdAt: file.created_at ? new Date(file.created_at).getTime() : 0,
            size: file.metadata?.size || 0,
            url: urlData.publicUrl,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      setNotes(voiceNotes);
    }
    setLoading(false);
  }

  const toggleSelect = (filename: string) => {
    const newSet = new Set(selected);
    if (newSet.has(filename)) newSet.delete(filename);
    else newSet.add(filename);
    setSelected(newSet);
  };

  const handleSelectAll = () => {
    if (selected.size === notes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notes.map(n => n.filename)));
    }
  };

  const handleSaveToLocal = async () => {
    const filesToSave = selected.size > 0 ? Array.from(selected) : notes.map(n => n.filename);
    if (filesToSave.length === 0) return;

    setIsSaving(true);
    const res = await saveToLocalDir(filesToSave);
    setIsSaving(false);

    if (res.error) {
      alert(`Error saving to local folder: ${res.error}`);
    } else {
      alert(`Successfully downloaded ${res.savedCount} file(s) to B:\\tiktok-ugc`);
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    
    const confirmDelete = confirm(`Are you sure you want to delete ${selected.size} note(s)?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    const res = await deleteNotes(Array.from(selected));
    setIsDeleting(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setSelected(new Set());
      fetchNotes();
    }
  };

  return (
    <main className="container">
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="title" style={{ textAlign: "left", marginBottom: "0" }}>Voice Notes</h1>
            <p className="subtitle" style={{ textAlign: "left", margin: 0 }}>
              Manage & download voice recordings
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn"
              onClick={handleSaveToLocal}
              disabled={notes.length === 0 || isSaving}
              style={{
                padding: "0.8rem 1.2rem",
                background: "var(--surface-border)",
                color: "white",
                opacity: notes.length > 0 && !isSaving ? 1 : 0.5,
                cursor: notes.length > 0 && !isSaving ? "pointer" : "not-allowed",
                fontSize: "0.9rem"
              }}
            >
              {isSaving ? "Saving..." : selected.size > 0 ? `Save (${selected.size}) to B:\\tiktok-ugc` : `Save All to B:\\tiktok-ugc`}
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handleDelete} 
              disabled={selected.size === 0 || isDeleting}
              style={{ 
                padding: "0.8rem 1.2rem", 
                background: selected.size > 0 ? "var(--danger)" : "var(--surface-border)",
                opacity: selected.size > 0 && !isDeleting ? 1 : 0.5,
                cursor: selected.size > 0 && !isDeleting ? "pointer" : "not-allowed",
                fontSize: "0.9rem"
              }}
            >
              {isDeleting ? "Deleting..." : `Delete (${selected.size})`}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading notes...</p>
        ) : notes.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No voice notes exist.</p>
        ) : (
          <div className="inbox-list" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 1rem" }}>
               <input 
                  type="checkbox" 
                  checked={selected.size === notes.length && notes.length > 0}
                  onChange={handleSelectAll}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                />
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Select All ({notes.length})</span>
            </div>

            {notes.map((note) => {
              const date = new Date(note.createdAt);
              return (
                <div key={note.filename} className="inbox-item" style={{ flexDirection: "row", alignItems: "center", gap: "1rem", padding: "1rem" }}>
                  <input 
                    type="checkbox" 
                    checked={selected.has(note.filename)}
                    onChange={() => toggleSelect(note.filename)}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", overflow: "hidden" }}>
                    <div className="inbox-header" style={{ justifyContent: "flex-start", gap: "1rem", padding: 0 }}>
                      <span style={{ whiteSpace: "nowrap" }}>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ color: "var(--primary)" }}>{(note.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <audio controls src={note.url} style={{ height: "32px", width: "100%", maxWidth: "300px" }} />
                  </div>
                  <a href={note.url} download={note.filename} className="btn-download" target="_blank" rel="noopener noreferrer" style={{ background: "var(--surface-border)", color: "white", padding: "0.5rem" }} title="Browser Download">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
