// Frontend API Client utility for connecting to backend (VITE_API_URL)

export const getApiUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim();
  if (envUrl.length > 0 && !envUrl.includes("placeholder") && !envUrl.includes("your-backend")) {
    return envUrl.replace(/\/+$/, "");
  }
  // In browser environment, fallback to current origin if API URL isn't set
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return "http://localhost:5000";
};

export async function fetchFromBackend<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
  }

  return response.json();
}

export async function checkBackendHealth() {
  try {
    return await fetchFromBackend("/api/health");
  } catch (error) {
    console.warn("Backend health check failed:", error);
    return { status: "offline", error };
  }
}

export async function checkBackendStatus() {
  try {
    return await fetchFromBackend("/api/status");
  } catch (error) {
    console.warn("Backend status check failed:", error);
    return { status: "offline", error };
  }
}
