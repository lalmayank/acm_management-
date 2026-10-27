export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  primary_role: "admin" | "volunteer" | "participant";
  registration_code?: string;
}

export function saveAuthSession(token: string, user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem("acm_token", token);
    localStorage.setItem("acm_user", JSON.stringify(user));
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("acm_user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("acm_token");
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("acm_token");
    localStorage.removeItem("acm_user");
  }
}

export function getRoleRedirect(role: string): string {
  switch (role.toLowerCase()) {
    case "admin":
      return "/admin/dashboard";
    case "volunteer":
      return "/volunteer/dashboard";
    case "participant":
    default:
      return "/participant/dashboard";
  }
}
