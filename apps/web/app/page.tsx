
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { traceCode, type TraceEvent } from "@/lib/api";

const DEFAULT_CODE = `def factorial(n):
    if n <= 1:
        return 1

    result = n * factorial(n - 1)
    return result

answer = factorial(3)
`;

type Frame = TraceEvent;

function getValueLabel(value: unknown): string {
  if (typeof value === "string") return value;
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const currentEvent = events[currentStep];
  const previousEvent = currentStep > 0 ? events[currentStep - 1] : undefined;

  // Reconstruct the active call stack from the events up to the selected step.
  const activeFrames = events
    .slice(0, currentStep + 1)
    .reduce<Frame[]>((frames, event) => {
      const existingIndex = frames.findIndex(
        (frame) => frame.frame_id === event.frame_id
      );

      if (event.event === "return") {
        return frames.filter((frame) => frame.frame_id !== event.frame_id);
      }

      if (existingIndex === -1) {
        return [...frames, event];
      }

      return frames.map((frame, index) =>
        index === existingIndex ? event : frame
      );
    }, []);

  const currentVariables = currentEvent?.variables ?? {};
  const previousVariables = previousEvent?.variables ?? {};

  const changedVariables = Object.entries(currentVariables).filter(
    ([name, value]) =>
      !(name in previousVariables) ||
      JSON.stringify(previousVariables[name]) !== JSON.stringify(value)
  );

  const removedVariables = Object.keys(previousVariables).filter(
    (name) => !(name in currentVariables)
  );

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const highlightCurrentLine = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) return;

    const line = currentEvent?.line;
    const model = editor.getModel();

    if (!line || !model || line < 1 || line > model.getLineCount()) {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        []
      );
      return;
    }

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      [
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "dryrun-current-line",
            linesDecorationsClassName: "dryrun-line-gutter",
          },
        },
      ]
    );

    editor.revealLineInCenterIfOutsideViewport(line);
  }, [currentEvent?.line]);

  useEffect(() => {
    highlightCurrentLine();
  }, [highlightCurrentLine]);

  useEffect(() => {
    if (!isPlaying || events.length === 0) return;

    const interval = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= events.length - 1) {
          setIsPlaying(false);
          return step;
        }
        return step + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying, events.length]);

  const handleRun = async () => {
    setIsPlaying(false);
    setIsLoading(true);
    setError("");

    try {
      const response = await traceCode(code);
      setEvents(response.events);
      setCurrentStep(0);

      if (response.events.length === 0) {
        setError("No execution events were recorded for this code.");
      }
    } catch (err) {
      setEvents([]);
      setCurrentStep(0);
      setError(
        err instanceof Error ? err.message : "Unable to trace this code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep = (step: number) => {
    setIsPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, events.length - 1)));
  };

  const formatEvent = (event: TraceEvent | undefined) => {
    if (!event) return "—";
    return event.event;
  };

  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100">
      <style jsx global>{`
        .dryrun-current-line {
          background: rgba(129, 140, 248, 0.16);
        }

        .dryrun-line-gutter {
          border-left: 3px solid #818cf8;
          margin-left: 3px;
        }

        .monaco-editor,
        .monaco-editor-background,
        .monaco-editor .margin {
          background-color: #17191f !important;
        }
      `}</style>

      <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-white/[0.07] bg-[#0b0d12]/95 px-5 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/15 text-xl font-bold text-indigo-300">
            D
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              DryRun AI
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Understand code visually
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRun}
          disabled={isLoading}
          className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Tracing..." : "▶ Run code"}
        </button>
      </header>

      <div className="grid min-h-[calc(100vh-82px)] grid-cols-1 gap-5 p-4 md:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(400px,0.88fr)]">
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#17191f]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Python Code</h2>
              <p className="mt-1 text-xs text-slate-500">
                Edit your program, then run the trace
              </p>
            </div>
            <span className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-slate-400">
              Python
            </span>
          </div>

          <div className="min-h-[480px] flex-1">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                lineHeight: 26,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 18, bottom: 18 },
                lineNumbers: "on",
                roundedSelection: true,
                renderLineHighlight: "all",
                tabSize: 4,
                wordWrap: "on",
              }}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 text-xs text-slate-500">
            <span>
              {code.split("\n").length} lines
            </span>
            <span>Changes are kept in the editor</span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-200"
            >
              <p className="font-semibold">Unable to trace code</p>
              <p className="mt-1 break-words text-rose-200/80">{error}</p>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Execution Trace</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Step through the recorded execution
                </p>
              </div>
              <span className="text-sm text-slate-400">
                {events.length > 0
                  ? `Step ${currentStep + 1} of ${events.length}`
                  : "No trace"}
              </span>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={events.length === 0 || currentStep === 0}
                  className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm transition hover:bg-white/[0.05] disabled:opacity-30"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false);
                    } else if (currentStep >= events.length - 1) {
                      setCurrentStep(0);
                      setIsPlaying(true);
                    } else {
                      setIsPlaying(true);
                    }
                  }}
                  disabled={events.length === 0}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-400 disabled:opacity-30"
                >
                  {isPlaying ? "Ⅱ Pause" : "▶ Play"}
                </button>

                <button
                  type="button"
                  onClick={() => goToStep(currentStep + 1)}
                  disabled={
                    events.length === 0 || currentStep >= events.length - 1
                  }
                  className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm transition hover:bg-white/[0.05] disabled:opacity-30"
                >
                  Next →
                </button>
              </div>

              <input
                aria-label="Execution step"
                type="range"
                min={0}
                max={Math.max(0, events.length - 1)}
                value={currentStep}
                onChange={(event) => goToStep(Number(event.target.value))}
                disabled={events.length === 0}
                className="w-full cursor-pointer accent-indigo-400 disabled:cursor-not-allowed"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Current line</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {currentEvent?.line ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Event type</p>
                  <p className="mt-2 text-xl font-semibold text-indigo-300">
                    {formatEvent(currentEvent)}
                  </p>
                </div>
              </div>

              {currentEvent && (
                <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Function</span>
                    <span className="font-mono text-slate-200">
                      {currentEvent.function}()
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Frame ID</span>
                    <span className="font-mono text-indigo-300">
                      #{currentEvent.frame_id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Call Stack</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Active function invocations at this step
                </p>
              </div>
              <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs text-indigo-300">
                {activeFrames.length}{" "}
                {activeFrames.length === 1 ? "frame" : "frames"}
              </span>
            </div>

            <div className="space-y-3 p-4">
              {activeFrames.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No active frames at this step.
                </p>
              ) : (
                [...activeFrames].reverse().map((frame, index) => (
                  <div
                   
  key={`${frame.frame_id}-${frame.step}`}
                    className={`overflow-hidden rounded-xl border ${
                      index === 0
                        ? "border-indigo-400/40 bg-indigo-400/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] font-mono text-indigo-300">
                          ƒ
                        </div>
                        <div>
                          <p className="font-mono text-sm text-slate-200">
                            {frame.function}()
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Frame #{frame.frame_id} · Line {frame.line}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-300">
                        {index === 0 ? "ACTIVE" : "CALLER"}
                      </span>
                    </div>

                    <div className="border-t border-white/[0.07] px-4 py-3">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Local variables
                      </p>

                      {Object.entries(frame.variables).length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No local variables at this point.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(frame.variables).map(
                            ([name, value]) => (
                              <div
                                key={name}
                                className="flex items-start justify-between gap-4 rounded-lg bg-black/20 px-3 py-2"
                              >
                                <span className="font-mono text-sm text-slate-300">
                                  {name}
                                </span>
                                <span className="break-all text-right font-mono text-sm text-emerald-300">
                                  {getValueLabel(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Memory View</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Variables at the selected execution step
                </p>
              </div>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Current state
              </span>
            </div>

            <div className="p-4">
              {Object.entries(currentVariables).length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No local variables at this step.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(currentVariables).map(([name, value]) => {
                    const isNew = !(name in previousVariables);
                    const changed =
                      !isNew &&
                      JSON.stringify(previousVariables[name]) !==
                        JSON.stringify(value);

                    return (
                      <div
                        key={name}
                        className="rounded-xl border border-indigo-400/25 bg-indigo-400/[0.05] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Variable
                          </span>
                          {isNew ? (
                            <span className="rounded-md bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold text-indigo-300">
                              NEW
                            </span>
                          ) : changed ? (
                            <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                              UPDATED
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              UNCHANGED
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-mono text-sm text-slate-200">
                          {name}
                        </p>
                        <div className="my-3 border-t border-white/[0.07]" />
                        <p className="break-all font-mono text-xl font-semibold text-emerald-300">
                          {getValueLabel(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {removedVariables.length > 0 && (
                <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3">
                  <p className="mb-2 text-xs font-semibold text-rose-300">
                    Variables no longer present in this snapshot
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {removedVariables.map((name) => (
                      <span
                        key={name}
                        className="rounded-md bg-rose-400/10 px-2 py-1 font-mono text-xs text-rose-200"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    ✳
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      State snapshot
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      These values were captured by the Python tracer for the
                      selected execution event.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {events.length > 0 && (
            <p className="px-1 text-xs leading-5 text-slate-600">
              Trace events represent recorded Python execution points. The
              current visualization is line-based, not a complete simulation
              of every internal operation.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
