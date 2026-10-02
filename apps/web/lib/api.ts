const API_BASE_URL = "http://localhost:8000";

export type HealthResponse = {
  status: string;
  service: string;
};

export type TraceEvent = {
  step: number;
  line: number;
  event: string;
  variables: Record<string, unknown>;
};

export type TraceResponse = {
  events: TraceEvent[];
};

export async function checkBackend(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export async function traceCode(code: string): Promise<TraceResponse> {
  const response = await fetch(`${API_BASE_URL}/trace`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Trace request failed: ${errorText}`);
  }

  return response.json() as Promise<TraceResponse>;
}