"use client";

import { useState, useRef, useEffect } from "react";

const MAX_DURATION = 180; // 3 minutes
const WARNING_THRESHOLD = 165; // Warning starts 15 seconds before max limit

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hitMaxLimit, setHitMaxLimit] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setHitMaxLimit(false);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION - 1) {
            setHitMaxLimit(true);
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record a voice note.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discardRecording = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setHitMaxLimit(false);
  };

  const submitRecording = async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voicenote.webm");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Failed to submit recording. Please try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="container">
        <div className="record-container">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <button
              className="mic-button"
              style={{ backgroundColor: "transparent", border: "4px solid var(--primary)" }}
              onClick={() => { setSubmitted(false); discardRecording(); }}
            >
              <svg className="mic-icon" style={{ fill: "var(--primary)" }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </button>
            <p style={{ marginTop: "1.5rem", color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 500 }}>Thank you!</p>
          </div>
        </div>
      </main>
    );
  }

  const isWarningPhase = isRecording && recordingTime >= WARNING_THRESHOLD;
  const secondsLeft = MAX_DURATION - recordingTime;

  return (
    <main className="container">
      <div className="record-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          {!audioUrl ? (
            <>
              <button
                className={`mic-button ${isRecording ? "recording" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                style={isWarningPhase ? { borderColor: "var(--danger)" } : {}}
              >
                {isRecording ? (
                  <div style={{ width: "30px", height: "30px", backgroundColor: isWarningPhase ? "var(--danger)" : "var(--primary)", borderRadius: "4px" }}></div>
                ) : (
                  <svg className="mic-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  </svg>
                )}
              </button>

              <div className="recording-status" style={isWarningPhase ? { color: "var(--danger)" } : {}}>
                {formatTime(recordingTime)}
              </div>

              {isWarningPhase && (
                <p style={{ margin: "0.5rem 0 0 0", color: "var(--danger)", fontSize: "0.85rem", fontWeight: 600 }}>
                  ⚠️ Wrapping up... {secondsLeft}s remaining
                </p>
              )}

              {isRecording && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(recordingTime / MAX_DURATION) * 100}%`,
                      backgroundColor: isWarningPhase ? "var(--danger)" : "var(--primary)"
                    }}
                  ></div>
                </div>
              )}
            </>
          ) : (
            <div style={{ width: "100%" }}>
              {hitMaxLimit && (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  ⏱️ Maximum 3-minute limit reached
                </p>
              )}

              <div className="recording-status" style={{ textAlign: "center", marginBottom: "1rem" }}>
                {formatTime(recordingTime)}
              </div>

              <div className="audio-preview">
                <audio controls src={audioUrl} />
              </div>

              <div className="actions">
                <button className="btn btn-secondary" onClick={discardRecording} disabled={isSubmitting}>
                  Discard
                </button>
                <button className="btn btn-primary" onClick={submitRecording} disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
