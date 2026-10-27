"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  Radio,
  Ticket,
  CheckSquare,
  Shield,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Megaphone,
  PlusCircle,
  Clock,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [stage, setStage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, stageData] = await Promise.all([
          apiRequest("/reports/stats"),
          apiRequest("/stage/current"),
        ]);
        setStats(statsData);
        setStage(stageData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(async () => {
      try {
        const [st, sg] = await Promise.all([
          apiRequest("/reports/stats"),
          apiRequest("/stage/current"),
        ]);
        setStats(st);
        setStage(sg);
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading Admin Operations Cockpit...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-200 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" /> ORGANIZER COMMAND CENTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Event Operations Overview</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Realtime monitoring across participants, teams, tickets, live pitch schedule, and volunteer staff.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/stage"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition-all"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Control Live Stage
          </Link>
          <Link
            href="/admin/tickets"
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Manage Tickets
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Participants" value={stats?.total_participants || 0} icon={Users} color="text-neutral-200" />
        <StatCard label="Registered Teams" value={stats?.total_teams || 0} icon={Users} color="text-blue-400" />
        <StatCard label="Tickets Issued" value={stats?.total_tickets_issued || 0} icon={Ticket} color="text-purple-400" />
        <StatCard label="Tickets Redeemed" value={stats?.total_tickets_redeemed || 0} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Pending Tasks" value={stats?.pending_tasks || 0} icon={CheckSquare} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live Stage Status & Schedule */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                <h2 className="text-base font-bold text-white tracking-tight">Current Stage State</h2>
              </div>
              <Link href="/admin/stage" className="text-xs font-bold text-neutral-200 hover:underline flex items-center gap-1">
                Advance Stage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stage?.current_presentation ? (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-rose-500/40">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                  Active Pitch (LIVE)
                </div>
                <div className="text-xl font-black text-white">
                  {stage.current_presentation.team_name}
                </div>
                <div className="text-sm text-neutral-300">
                  {stage.current_presentation.project_title}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="w-3.5 h-3.5" /> Slot #{stage.current_presentation.position} &bull; Presentation in progress
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] text-center text-sm text-neutral-500">
                No team is marked as currently on stage. Open Stage Controller to activate a pitch.
              </div>
            )}
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/participants"
              className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] transition-all space-y-2 group shadow-md"
            >
              <FileSpreadsheet className="w-6 h-6 text-neutral-200 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-bold text-white">Participant Roster</div>
              <div className="text-xs text-neutral-400">Import CSV lists and view individual registration accounts.</div>
            </Link>

            <Link
              href="/admin/teams"
              className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] hover:border-blue-500/50 hover:bg-white/[0.03] transition-all space-y-2 group shadow-md"
            >
              <Users className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-bold text-white">Teams &amp; Pitches</div>
              <div className="text-xs text-neutral-400">Manage startup teams, leaders, and presentation order.</div>
            </Link>

            <Link
              href="/admin/announcements"
              className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] hover:border-purple-500/50 hover:bg-white/[0.03] transition-all space-y-2 group shadow-md"
            >
              <Megaphone className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-bold text-white">Announcements</div>
              <div className="text-xs text-neutral-400">Broadcast immediate event updates to attendees and volunteers.</div>
            </Link>
          </div>
        </div>

        {/* Right Col: Live Scans Feed */}
        <div className="space-y-6">
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-neutral-200" />
                <h2 className="text-base font-bold text-white tracking-tight">Recent Scans</h2>
              </div>
              <Link href="/admin/history" className="text-xs font-semibold text-neutral-200 hover:underline">
                Full Audit
              </Link>
            </div>

            {stats?.recent_scans?.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {stats.recent_scans.map((s: any) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${s.outcome === "VALID" ? "bg-emerald-400" : "bg-red-400"}`} />
                        {s.outcome}
                      </div>
                      <div className="text-neutral-500 text-[11px] mt-0.5">By {s.validator}</div>
                    </div>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No scans logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 rounded-2xl bg-[#121214] border border-white/[0.08] shadow-md space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-400">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
