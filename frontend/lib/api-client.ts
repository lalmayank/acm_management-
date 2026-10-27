// API Client for ACM Shark Tank Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  
  // Attach token from localStorage if in browser and not explicitly passed
  let token = options.token;
  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("acm_token") || undefined;
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // for HTTP-only cookies
  });

  if (!response.ok) {
    let errorDetail = "Network request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // If status is 204 or empty response
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
