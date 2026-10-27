import React from "react";

interface BadgeProps {
  variant?: "available" | "redeemed" | "expired" | "revoked" | "pending" | "live" | "info" | "urgent";
  children: React.ReactNode;
}

export function Badge({ variant = "info", children }: BadgeProps) {
  const styles = {
    available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    redeemed: "bg-white/[0.05] text-neutral-400 border-white/[0.08]",
    expired: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    revoked: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    pending: "bg-white/[0.07] text-neutral-300 border-white/[0.1]",
    live: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    urgent: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    info: "bg-white/[0.05] text-neutral-300 border-white/[0.08]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border ${
        styles[variant] || styles.info
      }`}
    >
      {variant === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-pulse" />
      )}
      {children}
    </span>
  );
}
