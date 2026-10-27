"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { saveAuthSession, getRoleRedirect, AuthUser } from "@/lib/auth";
import { Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest<{
        access_token: string;
        user: any;
        primary_role: "admin" | "volunteer" | "participant";
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email_or_registration_id: identifier,
          password: password,
        }),
      });

      const authUser: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        roles: res.user.roles,
        primary_role: res.primary_role,
        registration_code: res.user.registration_code,
      };

      saveAuthSession(res.access_token, authUser);
      router.push(getRoleRedirect(res.primary_role));
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-16 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm px-4">
        <div className="flex justify-center">
          <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center font-bold text-black text-sm tracking-tight shadow-md">
            ST
          </div>
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-white">
          Sign In
        </h1>
        <p className="mt-1 text-center text-xs text-neutral-400">
          ACM Shark Tank Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm px-4">
        <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Team Name, Email, or Reg Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Team Name (e.g. Apex AI) or Email"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-[#222225] transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                Participants sign in with their Team Name &amp; individual password
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-[#222225] transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-black bg-white hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
