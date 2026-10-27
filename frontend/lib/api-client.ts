// API Client for ACM Shark Tank Backend

/**
 * Dynamically resolves the API base URL from environment variables (.env / .env.local).
 * Priority:
 * 1. NEXT_PUBLIC_API_URL if configured in environment
 * 2. In browser: use relative "/api/v1" (routed via Next.js rewrites in next.config.ts)
 * 3. Server-side: use BACKEND_URL/NEXT_PUBLIC_API_URL or fallback to 127.0.0.1
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    // Relative path leverages Next.js rewrites, ensuring seamless cookie sharing and zero CORS friction
    return "/api/v1";
  }

  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  return `${backendUrl.replace(/\/+$/, "")}/api/v1`;
}

export interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const apiBase = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Avoid duplicate /api/v1 prefixes if both base and endpoint have it
  const url =
    apiBase.endsWith("/api/v1") && cleanEndpoint.startsWith("/api/v1")
      ? `${apiBase.slice(0, -7)}${cleanEndpoint}`
      : `${apiBase}${cleanEndpoint}`;

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
