
"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { traceCode, type TraceEvent } from "../lib/api";

const DEFAULT_CODE = `x = 10
x = x + 5
y = x * 2`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const editorRef =
    useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const currentEvent = events[currentStep];
  const previousEvent = currentStep > 0 ? events[currentStep - 1] : undefined;

  const variableChanges = Object.entries(currentEvent?.variables ?? {}).map(
    ([name, value]) => {
      const previousVariables = previousEvent?.variables ?? {};
      const existedBefore = Object.hasOwn(previousVariables, name);
      const changed =
        !existedBefore ||
        JSON.stringify(previousVariables[name]) !== JSON.stringify(value);

      return { name, value, changed, existedBefore, previousValue: previousVariables[name] };
    }
  );

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) return;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      currentEvent
        ? [{
            range: new monaco.Range(currentEvent.line, 1, currentEvent.line, 1),
            options: {
              isWholeLine: true,
              className: "dryrun-current-line",
              glyphMarginClassName: "dryrun-current-line-glyph",
            },
          }]
        : []
    );

    if (currentEvent) editor.revealLineInCenter(currentEvent.line);
  }, [currentEvent]);

  useEffect(() => {
    if (!isPlaying || events.length === 0) return;

    const timer = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= events.length - 1) {
          setIsPlaying(false);
          return step;
        }
        return step + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to trace this code.");
    } finally {
      setIsLoading(false);
    }
  }

  function moveToStep(step: number) {
    setIsPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, events.length - 1)));
  }

  function togglePlayback() {
    if (events.length === 0) return;

    if (!isPlaying && currentStep === events.length - 1) {
      setCurrentStep(0);
    }

    setIsPlaying((playing) => !playing);
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0b0d12]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-lg font-bold text-indigo-300 ring-1 ring-indigo-400/25">
              D
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">DryRun AI</h1>
              <p className="text-xs text-slate-500">Understand code visually</p>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Tracing..." : "▶ Run code"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Python playground
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            See what your code does.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Step through execution, follow variable changes, and understand
            how the program state evolves.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(380px,1fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e] shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold">Source code</h3>
                <p className="mt-1 text-xs text-slate-500">main.py</p>
              </div>
              <span className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-slate-400">
                Python
              </span>
            </div>

            <Editor
              height="520px"
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
                lineHeight: 25,
                minimap: { enabled: false },
                lineNumbers: "on",
                glyphMargin: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20, bottom: 20 },
                roundedSelection: true,
              }}
            />

            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 text-xs text-slate-500">
              <span>{code.split("\n").length} lines</span>
              <span>Changes are kept in the editor</span>
            </div>
          </section>

          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Execution timeline</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Navigate through recorded states
                  </p>
                </div>
                <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
                  {events.length ? `${currentStep + 1} / ${events.length}` : "Ready"}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveToStep(currentStep - 1)}
                    disabled={!events.length || currentStep === 0}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={togglePlayback}
                    disabled={!events.length}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-30"
                  >
                    {isPlaying ? "Ⅱ Pause" : "▶ Play"}
                  </button>
                  <button
                    onClick={() => moveToStep(currentStep + 1)}
                    disabled={!events.length || currentStep >= events.length - 1}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>

                <input
                  aria-label="Execution step"
                  type="range"
                  min={0}
                  max={Math.max(events.length - 1, 0)}
                  value={currentStep}
                  disabled={!events.length}
                  onChange={(event) => moveToStep(Number(event.target.value))}
                  className="mt-6 w-full accent-indigo-400 disabled:opacity-30"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-xs text-slate-500">Current line</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {currentEvent?.line ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-xs text-slate-500">Event type</p>
                    <p className="mt-2 text-lg font-semibold text-indigo-300">
                      {currentEvent?.event ?? "Waiting"}
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                {!error && events.length === 0 && (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    Run your code to see its execution steps here.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#13161e]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Memory view</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Variables at the selected step
                  </p>
                </div>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Current state
                </span>
              </div>

              <div className="p-5">
                {!currentEvent ? (
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
                    <span className="text-2xl text-slate-600">◇</span>
                    <p className="mt-2 text-sm text-slate-400">Memory is waiting</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Run the program to inspect variables
                    </p>
                  </div>
                ) : variableChanges.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No local variables at this step.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {variableChanges.map((variable) => (
                      <div
                        key={variable.name}
                        className={`min-w-0 rounded-xl border p-4 transition-colors ${
                          variable.changed
                            ? "border-indigo-400/40 bg-indigo-400/[0.07]"
                            : "border-white/[0.08] bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Variable
                          </span>
                          {variable.changed && (
                            <span className="rounded-md bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-indigo-300">
                              {variable.existedBefore ? "UPDATED" : "NEW"}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 font-mono text-sm font-semibold text-slate-200">
                          {variable.name}
                        </p>

                        <div className="my-3 h-px bg-white/[0.08]" />

                        <p className="break-words font-mono text-2xl font-semibold tracking-tight text-emerald-300">
                          {JSON.stringify(variable.value)}
                        </p>

                        {variable.changed && variable.existedBefore && (
                          <p className="mt-2 break-words text-xs text-slate-500">
                            Previous value:{" "}
                            <span className="font-mono text-slate-400">
                              {JSON.stringify(variable.previousValue)}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {currentEvent && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <span className="mt-0.5 text-indigo-300">✳</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">
                        State snapshot
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        These values were captured by the Python tracer for
                        the selected execution event.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
