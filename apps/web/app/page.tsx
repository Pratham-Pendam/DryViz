"use client";

import { useState } from "react";
import { checkBackend } from "../lib/api";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>("Not tested");
  const [loading, setLoading] = useState(false);

  const handleBackendTest = async () => {
    try {
      setLoading(true);
      setBackendStatus("Connecting...");

      const result = await checkBackend();

      setBackendStatus(
        `${result.status} — ${result.service}`
      );
    } catch (error) {
      console.error(error);
      setBackendStatus("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <h1>DryRun AI</h1>

      <p>
        Understand what your code is doing, step by step.
      </p>

      <button
        onClick={handleBackendTest}
        disabled={loading}
        style={{
          marginTop: "30px",
          padding: "12px 24px",
          borderRadius: "6px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
        }}
      >
        {loading ? "Connecting..." : "Test Backend"}
      </button>

      <p style={{ marginTop: "20px" }}>
        Backend status: {backendStatus}
      </p>
    </main>
  );
}