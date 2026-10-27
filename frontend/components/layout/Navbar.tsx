"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getAuthUser, clearAuthSession, AuthUser } from "@/lib/auth";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  if (!user || pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/75 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href={
              user.primary_role === "admin"
                ? "/admin/dashboard"
                : user.primary_role === "volunteer"
                ? "/volunteer/dashboard"
                : "/participant/dashboard"
            }
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-black text-xs tracking-tight shadow-sm">
              ST
            </div>
            <span className="font-semibold tracking-tight text-white text-sm hidden sm:inline">
              Shark Tank
            </span>
          </Link>

          {/* Navigation Links according to role */}
          <nav className="hidden md:flex items-center gap-1">
            {user.primary_role === "participant" && (
              <>
                <NavLink href="/participant/dashboard" active={pathname === "/participant/dashboard"}>
                  Dashboard
                </NavLink>
                <NavLink href="/participant/tickets" active={pathname.startsWith("/participant/tickets")}>
                  Tickets
                </NavLink>
                <NavLink href="/participant/announcements" active={pathname === "/participant/announcements"}>
                  Announcements
                </NavLink>
                <NavLink href="/participant/history" active={pathname === "/participant/history"}>
                  History
                </NavLink>
              </>
            )}

            {user.primary_role === "volunteer" && (
              <>
                <NavLink href="/volunteer/dashboard" active={pathname === "/volunteer/dashboard"}>
                  Overview
                </NavLink>
                <NavLink href="/volunteer/validate" active={pathname === "/volunteer/validate"}>
                  Validator
                </NavLink>
                <NavLink href="/volunteer/announcements" active={pathname === "/volunteer/announcements"}>
                  Announcements
                </NavLink>
                <NavLink href="/volunteer/assigned-work" active={pathname === "/volunteer/assigned-work"}>
                  Assigned Work
                </NavLink>
                <NavLink href="/volunteer/history" active={pathname.startsWith("/volunteer/history")}>
                  Team History
                </NavLink>
              </>
            )}

            {user.primary_role === "admin" && (
              <>
                <NavLink href="/admin/dashboard" active={pathname === "/admin/dashboard"}>
                  Dashboard
                </NavLink>
                <NavLink href="/admin/stage" active={pathname === "/admin/stage"}>
                  Live Stage
                </NavLink>
                <NavLink href="/admin/tickets" active={pathname.startsWith("/admin/tickets")}>
                  Tickets
                </NavLink>
                <NavLink href="/admin/teams" active={pathname === "/admin/teams"}>
                  Teams
                </NavLink>
                <NavLink href="/admin/participants" active={pathname === "/admin/participants"}>
                  Participants
                </NavLink>
                <NavLink href="/admin/volunteers" active={pathname === "/admin/volunteers"}>
                  Volunteers
                </NavLink>
                <NavLink href="/admin/tasks" active={pathname === "/admin/tasks"}>
                  Tasks
                </NavLink>
                <NavLink href="/admin/announcements" active={pathname === "/admin/announcements"}>
                  Announcements
                </NavLink>
                <NavLink href="/admin/history" active={pathname === "/admin/history"}>
                  Audit Logs
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border border-white/[0.1] bg-white/[0.05] text-neutral-300 uppercase tracking-wide">
              {user.primary_role}
            </span>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-neutral-200 leading-tight">{user.name}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
        active
          ? "bg-white/[0.12] text-white border border-white/[0.1] shadow-sm"
          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </Link>
  );
}
