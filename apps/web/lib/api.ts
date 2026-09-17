const API_BASE_URL = "http://localhost:8000";

export type HealthResponse = {
  status: string;
  service: string;
};

export async function checkBackend(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}