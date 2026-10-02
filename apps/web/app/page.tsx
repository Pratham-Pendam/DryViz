"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { traceCode, type TraceEvent } from "../lib/api";

const DEFAULT_CODE = `x = 5
y = x + 3
print(y)`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const currentEvent = events[currentStep];

  // Highlight the source line corresponding to the selected trace event.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) {
      return;
    }

    if (!currentEvent) {
      decorationIdsRef.current = editor.deltaDecorations(
        decorationIdsRef.current,
        []
      );
      return;
    }

    const line = currentEvent.line;

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      [
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "dryrun-current-line",
            glyphMarginClassName: "dryrun-current-line-glyph",
          },
        },
      ]
    );

    editor.revealLineInCenter(line);
  }, [currentEvent]);

  // Automatically advance through trace events while playing.
  useEffect(() => {
    if (!isPlaying || events.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= events.length - 1) {
          setIsPlaying(false);
          return step;
        }

        return step + 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, events.length]);

  async function handleRun() {
    setIsPlaying(false);
    setIsLoading(true);
    setError("");
    setEvents([]);
    setCurrentStep(0);

    try {
      const response = await traceCode(code);
      setEvents(response.events);
      setCurrentStep(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while tracing."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handlePrevious() {
    setIsPlaying(false);
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function handleNext() {
    setIsPlaying(false);
    setCurrentStep((step) => Math.min(events.length - 1, step + 1));
  }

  function handlePlayPause() {
    if (events.length === 0) {
      return;
    }

    if (currentStep >= events.length - 1 && !isPlaying) {
      setCurrentStep(0);
    }

    setIsPlaying((playing) => !playing);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>DryRun AI</h1>
          <p>Understand code, one step at a time.</p>
        </div>

        <button
          className="run-button"
          onClick={handleRun}
          disabled={isLoading}
        >
          {isLoading ? "Tracing..." : "Run"}
        </button>
      </header>

      <section className="workspace">
        <div className="panel code-panel">
          <div className="panel-heading">
            <h2>Python Code</h2>
            <span>Editor</span>
          </div>

          <Editor
            height="420px"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
            }}
            options={{
              fontSize: 15,
              minimap: { enabled: false },
              lineNumbers: "on",
              glyphMargin: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
            }}
          />
        </div>

        <div className="panel trace-panel">
          <div className="panel-heading">
            <h2>Execution Trace</h2>
            <span>
              {events.length > 0
                ? `Step ${currentStep + 1} of ${events.length}`
                : "Not started"}
            </span>
          </div>

          <div className="controls">
            <button onClick={handlePrevious} disabled={events.length === 0}>
              Previous
            </button>

            <button
              className="play-button"
              onClick={handlePlayPause}
              disabled={events.length === 0}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              onClick={handleNext}
              disabled={events.length === 0 || currentStep >= events.length - 1}
            >
              Next
            </button>
          </div>

          <input
            className="step-slider"
            type="range"
            min={0}
            max={Math.max(events.length - 1, 0)}
            value={currentStep}
            disabled={events.length === 0}
            onChange={(event) => {
              setIsPlaying(false);
              setCurrentStep(Number(event.target.value));
            }}
          />

          {error && <p className="error-message">{error}</p>}

          {!error && events.length === 0 && (
            <div className="empty-state">
              Press <strong>Run</strong> to generate a trace.
            </div>
          )}

          {currentEvent && (
            <div className="trace-details">
              <div className="detail-card">
                <span className="detail-label">Current line</span>
                <strong>{currentEvent.line}</strong>
              </div>

              <div className="detail-card">
                <span className="detail-label">Event</span>
                <strong>{currentEvent.event}</strong>
              </div>

              <h3>Variables</h3>

              {Object.keys(currentEvent.variables).length === 0 ? (
                <p className="muted">No variables recorded at this step.</p>
              ) : (
                <div className="variables">
                  {Object.entries(currentEvent.variables).map(([name, value]) => (
                    <div className="variable-row" key={name}>
                      <code>{name}</code>
                      <code>{JSON.stringify(value)}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}