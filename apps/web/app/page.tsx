"use client";

import { useState } from "react";

export default function Home() {
  const [code, setCode] = useState(
    `x = 5
y = x + 3`
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px"
      }}
    >
      <h1>DryRun AI</h1>

      <p>
        Understand what your code is doing, step by step.
      </p>

      <textarea
        value={code}
        onChange={(event) => setCode(event.target.value)}
        style={{
          width: "100%",
          height: "300px",
          marginTop: "30px",
          padding: "20px",
          background: "#1a1d24",
          color: "#ffffff",
          border: "1px solid #333",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "16px",
          resize: "vertical"
        }}
      />

      <button
        style={{
          marginTop: "20px",
          padding: "12px 24px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        Understand Code
      </button>
    </main>
  );
}