"use client";

import { useEffect, useState } from "react";
import { TraceEvent, traceCode } from "../lib/api";

const DEFAULT_CODE = `x = 5
y = x + 3
print(y)`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentEvent = events[currentStep];

  const handleRun = async () => {
    setIsLoading(true);
    setIsPlaying(false);
    setError(null);

    try {
      const result = await traceCode(code);

      setEvents(result.events);
      setCurrentStep(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStep((step) => Math.min(events.length - 1, step + 1));
  };

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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>DryRun AI</h1>

      <p>
        Understand what your code is doing, step by step.
      </p>

      <section style={{ marginTop: "32px" }}>
        <h2>Python Code</h2>

        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            height: "220px",
            padding: "16px",
            background: "#1a1d24",
            color: "#ffffff",
            border: "1px solid #333",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "16px",
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />

        <button
          onClick={handleRun}
          disabled={isLoading}
          style={{
            marginTop: "16px",
            padding: "12px 24px",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {isLoading ? "Running..." : "Run Code"}
        </button>
      </section>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#451d1d",
            color: "#ffb4b4",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {events.length > 0 && currentEvent && (
        <section style={{ marginTop: "32px" }}>
          <h2>Execution Visualizer</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "#1a1d24",
                borderRadius: "8px",
              }}
            >
              <h3>Current Execution</h3>

              <p>
                Step: {currentEvent.step + 1} / {events.length}
              </p>

              <p>
                Executing line: {currentEvent.line}
              </p>

              <p>
                Event: {currentEvent.event}
              </p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "#1a1d24",
                borderRadius: "8px",
              }}
            >
              <h3>Variables</h3>

              {Object.entries(currentEvent.variables).length === 0 ? (
                <p>No variables recorded yet.</p>
              ) : (
                Object.entries(currentEvent.variables).map(
                  ([name, value]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: "1px solid #333",
                        fontFamily: "monospace",
                      }}
                    >
                      <strong>{name}</strong>
                      <span>{JSON.stringify(value)}</span>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <input
              type="range"
              min={0}
              max={events.length - 1}
              value={currentStep}
              onChange={(event) => {
                setIsPlaying(false);
                setCurrentStep(Number(event.target.value));
              }}
              style={{
                width: "100%",
                cursor: "pointer",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
              }}
            >
              <span>Step {currentStep + 1}</span>
              <span>{events.length} total steps</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <button onClick={handlePrevious} disabled={currentStep === 0}>
              Previous
            </button>

            <button
              onClick={() => setIsPlaying((playing) => !playing)}
              disabled={events.length <= 1}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep >= events.length - 1}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}