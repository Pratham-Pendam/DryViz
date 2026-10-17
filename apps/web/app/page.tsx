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

  const previousEvent = currentStep > 0 ? events[currentStep - 1] : undefined;

function getVariableChanges() {
  if (!currentEvent) {
    return [];
  }

  const previousVariables = previousEvent?.variables ?? {};
  const currentVariables = currentEvent.variables;

  const variableNames = new Set([
    ...Object.keys(previousVariables),
    ...Object.keys(currentVariables),
  ]);

  return Array.from(variableNames).map((name) => {
    const existedBefore = Object.prototype.hasOwnProperty.call(
      previousVariables,
      name
    );

    const existsNow = Object.prototype.hasOwnProperty.call(
      currentVariables,
      name
    );

    const previousValue = previousVariables[name];
    const currentValue = currentVariables[name];

    const changed =
      !existedBefore ||
      !existsNow ||
      JSON.stringify(previousValue) !== JSON.stringify(currentValue);

    return {
      name,
      previousValue,
      currentValue,
      existedBefore,
      existsNow,
      changed,
    };
  });
}

const variableChanges = getVariableChanges();

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
              
<div className="memory-panel">
  <div className="memory-panel-heading">
    <h3>Memory View</h3>
    <span>Current state</span>
  </div>

  {Object.keys(currentEvent.variables).length === 0 ? (
    <p className="muted">Memory is empty at this step.</p>
  ) : (
    <div className="memory-grid">
      {Object.entries(currentEvent.variables).map(([name, value]) => {
        const change = variableChanges.find(
          (variable) => variable.name === name
        );

        return (
          <div
            className={`memory-cell ${
              change?.changed ? "memory-cell-changed" : ""
            }`}
            key={name}
          >
            <div className="memory-cell-top">
              <span>VARIABLE</span>
              {change?.changed && <span className="memory-status">UPDATED</span>}
            </div>

            <div className="memory-cell-name">{name}</div>

            <div className="memory-cell-divider" />

            <div className="memory-cell-value">
              {JSON.stringify(value)}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
{/* </div> */}

              <div className="detail-card">
                <span className="detail-label">Current line</span>
                <strong>{currentEvent.line}</strong>
              </div>

              <div className="detail-card">
                <span className="detail-label">Event</span>
                <strong>{currentEvent.event}</strong>
              </div>

              <h3>Variables</h3>
              <div className="variables-heading">
  <h3>Memory Changes</h3>
  <span>
    {variableChanges.filter((variable) => variable.changed).length} changed
  </span>
</div>

{/* {variableChanges.length === 0 ? (
  <p className="muted">No variables recorded at this step.</p>
) : (
  <div className="variables">
    {variableChanges.map((variable) => (
      <div
        className={`variable-row ${
          variable.changed ? "variable-changed" : ""
        }`}
        key={variable.name}
      >
        <div className="variable-info">
          <code className="variable-name">{variable.name}</code>

          {variable.changed && (
            <span className="change-badge">
              {!variable.existedBefore
                ? "NEW"
                : !variable.existsNow
                  ? "REMOVED"
                  : "CHANGED"}
            </span>
          )}
        </div>

        <div className="variable-values">
          {variable.changed && (
            <code className="previous-value">
              {variable.existedBefore
                ? JSON.stringify(variable.previousValue)
                : "—"}
            </code>
          )}

          {variable.changed && <span className="value-arrow">→</span>}

          <code className="current-value">
            {variable.existsNow
              ? JSON.stringify(variable.currentValue)
              : "—"}
          </code>
        </div>
      </div>
    ))}
  </div>
)} */}

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