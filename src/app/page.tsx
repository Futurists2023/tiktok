"use client";

import { useState, useRef, useEffect } from "react";

const MAX_DURATION = 120; // 2 minutes

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          <div className="glass-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <p className="subtitle">Thank you! Your voice note has been delivered anonymously.</p>
            <button className="btn btn-secondary" onClick={() => { setSubmitted(false); discardRecording(); }}>
              Record Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="record-container">
        <div className="glass-panel" style={{ width: "100%" }}>
          <p className="subtitle">Tap the mic to start. Max 2 minutes.</p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "2rem" }}>
            {!audioUrl ? (
              <>
                <button
                  className={`mic-button ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <div style={{ width: "30px", height: "30px", backgroundColor: "var(--primary)", borderRadius: "4px" }}></div>
                  ) : (
                    <svg className="mic-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                    </svg>
                  )}
                </button>

                <div className="recording-status">
                  {formatTime(recordingTime)}
                </div>

                {isRecording && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(recordingTime / MAX_DURATION) * 100}%` }}></div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: "100%" }}>
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
      </div>
    </main>
  );
}
