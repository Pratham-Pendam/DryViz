"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

export default function Home() {
  // ============================================================
  // CODE
  // ============================================================

  const [code, setCode] = useState(`arr = [1, 2, 3]
x = 5
y = x + 3`);

  // ============================================================
  // SIMULATION STATE
  // ============================================================

  const [timeline, setTimeline] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [currentLine, setCurrentLine] = useState<number | null>(null);

  // ============================================================
  // PLAYBACK
  // ============================================================

  const [playing, setPlaying] = useState(false);

  // ============================================================
  // BREAKPOINTS
  // ============================================================

  const [breakpoints, setBreakpoints] = useState<number[]>([]);

  // ============================================================
  // MONACO REFERENCES
  // ============================================================

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Store current decoration IDs
  const decorationIdsRef = useRef<string[]>([]);

  // ============================================================
  // CURRENT TIMELINE STEP
  // ============================================================

  const current = timeline[step] || {};

  // ============================================================
  // PLAY ANIMATION
  // ============================================================

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;

        // Reached the end
        if (next >= timeline.length) {
          setPlaying(false);
          return prev;
        }

        const nextLine = timeline[next]?.line;

        // Stop when breakpoint is reached
        if (breakpoints.includes(nextLine)) {
          setPlaying(false);
          return next;
        }

        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [playing, timeline, breakpoints]);

  // ============================================================
  // UPDATE CURRENT LINE WHEN STEP CHANGES
  // ============================================================

  useEffect(() => {
    if (timeline.length === 0) {
      setCurrentLine(null);
      return;
    }

    setCurrentLine(timeline[step]?.line ?? null);
  }, [step, timeline]);

  // ============================================================
  // HIGHLIGHT CURRENT LINE
  // + SHOW CHANGED VARIABLES
  // ============================================================

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !currentLine) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const currentMemory = timeline[step]?.memory || {};
    const previousMemory = timeline[step - 1]?.memory || {};

    /*
     * Our memory looks like:
     *
     * {
     *   stack: [
     *     {
     *       function: "main",
     *       locals: {
     *         x: 5
     *       }
     *     }
     *   ]
     * }
     *
     * So for now we compare the complete memory object.
     */

    const changedVars: string[] = [];

    // Safely get current and previous stack
    const currentStack = currentMemory.stack || [];
    const previousStack = previousMemory.stack || [];

    const currentFrame = currentStack[currentStack.length - 1] || {};
    const previousFrame = previousStack[previousStack.length - 1] || {};

    const currentLocals = currentFrame.locals || {};
    const previousLocals = previousFrame.locals || {};

    const allKeys = new Set([
      ...Object.keys(currentLocals),
      ...Object.keys(previousLocals),
    ]);

    allKeys.forEach((key) => {
      if (
        JSON.stringify(currentLocals[key]) !==
        JSON.stringify(previousLocals[key])
      ) {
        changedVars.push(key);
      }
    });

    // Convert changed variables to text
    const varsText = changedVars
      .map(
        (key) =>
          `${key} = ${JSON.stringify(currentLocals[key])}`
      )
      .join(" | ");

    // Remove old decorations
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      [
        // Current line
        {
          range: new monaco.Range(
            currentLine,
            1,
            currentLine,
            1
          ),

          options: {
            isWholeLine: true,
            className: "highlightLine",
          },
        },

        // Changed variables
        {
          range: new monaco.Range(
            currentLine,
            1,
            currentLine,
            1
          ),

          options: {
            after: {
              content: varsText
                ? `   ← ${varsText}`
                : "",

              inlineClassName: "inlineVar",
            },
          },
        },
      ]
    );

    return () => {
      if (editorRef.current) {
        decorationIdsRef.current =
          editorRef.current.deltaDecorations(
            decorationIdsRef.current,
            []
          );
      }
    };
  }, [currentLine, step, timeline]);

  // ============================================================
  // BREAKPOINT DECORATIONS
  // ============================================================

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const breakpointDecorations = breakpoints.map((line) => ({
      range: new monaco.Range(
        line,
        1,
        line,
        1
      ),

      options: {
        isWholeLine: false,
        glyphMarginClassName: "breakpointGlyph",
      },
    }));

    editor.deltaDecorations(
      [],
      breakpointDecorations
    );
  }, [breakpoints]);

  // ============================================================
  // MONACO MOUNT
  // ============================================================

  const handleEditorMount = (
    editor: any,
    monaco: any
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // ----------------------------------------------------------
    // Detect clicks on the gutter
    // ----------------------------------------------------------

    editor.onMouseDown((event: any) => {
      if (
        event.target.type ===
        monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const line =
          event.target.position?.lineNumber;

        if (!line) return;

        setBreakpoints((previous) => {
          // Remove breakpoint
          if (previous.includes(line)) {
            return previous.filter(
              (item) => item !== line
            );
          }

          // Add breakpoint
          return [...previous, line];
        });
      }
    });
  };

  // ============================================================
  // RUN CODE
  // ============================================================

  const runCode = async () => {
    try {
      setPlaying(false);

      const res = await fetch(
        "http://localhost:8000/dry-run",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            code,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          `Server returned ${res.status}`
        );
      }

      const data = await res.json();

      // Debug information
      console.log(
        "DRY RUN RESPONSE:",
        data
      );

      const tl = data.timeline || [];

      setTimeline(tl);
      setStep(0);
      setCurrentLine(
        tl[0]?.line ?? null
      );
    } catch (error) {
      console.error(
        "DRY RUN ERROR:",
        error
      );
    }
  };

  // ============================================================
  // PREVIOUS STEP
  // ============================================================

  const previousStep = () => {
    setPlaying(false);

    setStep((previous) =>
      Math.max(previous - 1, 0)
    );
  };

  // ============================================================
  // NEXT STEP
  // ============================================================

  const nextStep = () => {
    setPlaying(false);

    setStep((previous) =>
      Math.min(
        previous + 1,
        timeline.length - 1
      )
    );
  };

  // ============================================================
  // PLAY
  // ============================================================

  const play = () => {
    if (timeline.length === 0) return;

    setPlaying(true);
  };

  // ============================================================
  // PAUSE
  // ============================================================

  const pause = () => {
    setPlaying(false);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <h1>
        🔥 Dry Run Visualizer
      </h1>

      {/* ======================================================
          CODE EDITOR
      ====================================================== */}

      <Editor
        height="300px"
        defaultLanguage="python"
        value={code}
        onChange={(value) =>
          setCode(value || "")
        }
        onMount={handleEditorMount}
        options={{
          glyphMargin: true,
          minimap: {
            enabled: false,
          },
          fontSize: 15,
        }}
      />

      {/* ======================================================
          RUN BUTTON
      ====================================================== */}

      <button
        onClick={runCode}
        style={{
          marginTop: 10,
          padding: "8px 16px",
          cursor: "pointer",
        }}
      >
        ▶ Run
      </button>

      <hr />

      {/* ======================================================
          SIMULATION
      ====================================================== */}

      {timeline.length > 0 && (
        <>
          {/* ==================================================
              STEP INFORMATION
          ================================================== */}

          <h3>
            Step: {step}
          </h3>

          <p>
            👉 Executing Line:{" "}
            <strong>
              {current.line}
            </strong>
          </p>

          {/* ==================================================
              MAIN VISUALIZATION AREA
          ================================================== */}

          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* ================================================
                VARIABLES
            ================================================ */}

            <div
              style={{
                border: "1px solid #333",
                padding: 12,
                borderRadius: 8,
                minWidth: 250,
              }}
            >
              <h3>
                📦 Variables
              </h3>

              <pre>
                {JSON.stringify(
                  current.memory,
                  null,
                  2
                )}
              </pre>
            </div>

            {/* ================================================
                HEAP
            ================================================ */}

            <div
              style={{
                border: "1px solid #333",
                padding: 12,
                borderRadius: 8,
                minWidth: 250,
              }}
            >
              <h3>
                🧠 Heap
              </h3>

              <pre>
                {JSON.stringify(
                  current.heap,
                  null,
                  2
                )}
              </pre>
            </div>

            {/* ================================================
                CALL STACK
            ================================================ */}

            <div
              style={{
                border: "1px solid #333",
                padding: 12,
                borderRadius: 8,
                minWidth: 300,
              }}
            >
              <h3>
                📚 Call Stack
              </h3>

              {(current.memory?.stack || [])
                .map(
                  (
                    frame: any,
                    index: number
                  ) => (
                    <div
                      key={index}
                      style={{
                        marginLeft:
                          index * 20,
                        marginBottom: 12,
                        padding: 10,
                        borderLeft:
                          "3px solid #00ffcc",
                        background:
                          "#111",
                        borderRadius: 6,
                      }}
                    >
                      {/* Function name */}

                      <div
                        style={{
                          fontWeight:
                            "bold",
                          color:
                            "#00ffcc",
                        }}
                      >
                        {frame.function ||
                          `Frame ${index}`}
                      </div>

                      {/* Locals */}

                      <div
                        style={{
                          marginTop: 6,
                        }}
                      >
                        {Object.entries(
                          frame.locals || {}
                        ).map(
                          ([
                            key,
                            value,
                          ]) => (
                            <div
                              key={key}
                            >
                              {key}:{" "}
                              {JSON.stringify(
                                value
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>

            {/* ================================================
                EXPRESSION EVALUATION
            ================================================ */}

            <div
              style={{
                border: "1px solid #333",
                padding: 12,
                borderRadius: 8,
                minWidth: 300,
              }}
            >
              <h3>
                🧮 Expression Evaluation
              </h3>

              {current.event ===
                "binary_operation" && (
                <div
                  style={{
                    border:
                      "1px solid #333",
                    padding: 12,
                    borderRadius: 10,
                  }}
                >
                  <p>
                    {current.left}{" "}
                    {current.operator}{" "}
                    {current.right}
                  </p>

                  <h2>
                    = {current.result}
                  </h2>
                </div>
              )}

              {current.event !==
                "binary_operation" && (
                <p>
                  No expression
                  evaluation at this
                  step.
                </p>
              )}
            </div>
          </div>

          {/* ==================================================
              TIMELINE SLIDER
          ================================================== */}

          <div
            style={{
              marginTop: 30,
            }}
          >
            <h3>
              ⏱ Timeline
            </h3>

            <input
              type="range"
              min={0}
              max={Math.max(
                timeline.length - 1,
                0
              )}
              value={step}
              onChange={(event) => {
                setPlaying(false);

                setStep(
                  Number(
                    event.target.value
                  )
                );
              }}
              style={{
                width: "100%",
                cursor: "pointer",
              }}
            />

            <div
              style={{
                marginTop: 8,
              }}
            >
              Step {step} /{" "}
              {timeline.length - 1}
            </div>
          </div>

          {/* ==================================================
              CONTROLS
          ================================================== */}

          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 8,
            }}
          >
            {/* Previous */}

            <button
              onClick={previousStep}
            >
              ⏮ Prev
            </button>

            {/* Play */}

            <button
              onClick={play}
              disabled={playing}
            >
              ▶ Play
            </button>

            {/* Pause */}

            <button
              onClick={pause}
              disabled={!playing}
            >
              ⏸ Pause
            </button>

            {/* Next */}

            <button
              onClick={nextStep}
            >
              ⏭ Next
            </button>
          </div>

          {/* ==================================================
              BREAKPOINT INFORMATION
          ================================================== */}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <strong>
              Breakpoints:
            </strong>{" "}

            {breakpoints.length === 0
              ? "None"
              : breakpoints.join(", ")}
          </div>
        </>
      )}
    </div>
  );
}