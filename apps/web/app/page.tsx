"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

export default function Home() {
  const [code, setCode] = useState(`x = 5
y = x + 3`);

  const [timeline, setTimeline] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  // ▶ Play animation
  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev < timeline.length - 1) return prev + 1;
        setPlaying(false);
        return prev;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [playing, timeline]);

  const runCode = async () => {
    const res = await fetch("http://localhost:8000/dry-run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setTimeline(data.timeline || []);
    setStep(0);
  };

  const current = timeline[step] || {};

  return (
    <div style={{ padding: 20 }}>
      <h1>🔥 Dry Run Visualizer</h1>

      {/* Code Editor */}
      <Editor
        height="200px"
        defaultLanguage="python"
        value={code}
        onChange={(value) => setCode(value || "")}
      />

      <button onClick={runCode}>Run</button>

      <hr />

      {timeline.length > 0 && (
        <>
          <h3>Step: {step}</h3>

          {/* Highlight Current Line */}
          <p>👉 Executing Line: {current.line}</p>

          <div style={{ display: "flex", gap: 20 }}>
            
            {/* Variables */}
            <div>
              <h3>Variables</h3>
              <pre>
                {JSON.stringify(current.memory, null, 2)}
              </pre>
            </div>

            {/* Call Stack */}
            <div>
              <h3>Call Stack</h3>
              <pre>
                {JSON.stringify(current.memory?.stack, null, 2)}
              </pre>
            </div>

          </div>

          {/* Controls */}
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setStep((s) => Math.max(s - 1, 0))}>
              ⏮ Prev
            </button>

            <button onClick={() => setPlaying(true)}>▶ Play</button>

            <button onClick={() => setPlaying(false)}>⏸ Pause</button>

            <button
              onClick={() =>
                setStep((s) => Math.min(s + 1, timeline.length - 1))
              }
            >
              ⏭ Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}