"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, getRoleRedirect } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      router.replace(getRoleRedirect(user.primary_role));
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Connecting to Shark Tank Operations...</span>
      </div>
    </div>
  );
}
