"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Ticket, Radio, Megaphone, ArrowRight, ShieldCheck, Sparkles, Clock, AlertCircle } from "lucide-react";

export default function ParticipantDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stage, setStage] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profData, tickData, stageData, annData] = await Promise.all([
          apiRequest("/participants/me"),
          apiRequest("/participants/me/tickets"),
          apiRequest("/stage/current"),
          apiRequest("/announcements/"),
        ]);
        setProfile(profData);
        setTickets(tickData);
        setStage(stageData);
        setAnnouncements(annData);
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Set up polling for stage and announcement updates
    const interval = setInterval(async () => {
      try {
        const s = await apiRequest("/stage/current");
        setStage(s);
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading your participant hub...
      </div>
    );
  }

  const availableCount = tickets.filter((t) => t.status === "AVAILABLE" || t.status === "PARTIALLY_USED").length;
  const redeemedCount = tickets.filter((t) => t.status === "REDEEMED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Hero */}
      <div className="bg-[#121214] p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-xl relative overflow-hidden">
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-neutral-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Participant Passholder
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.name || "Participant"}!
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Registration ID: <span className="font-mono text-neutral-200 font-semibold">{profile?.registration_code}</span>
              {profile?.team_name && (
                <> &bull; Team: <span className="text-neutral-200 font-semibold">{profile.team_name}</span></>
              )}
            </p>
          </div>

          <Link
            href="/participant/tickets"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-sm transition-all self-start sm:self-center"
          >
            <Ticket className="w-4 h-4" />
            Present My Tickets
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Stage Card & Announcements */}
        <div className="lg:col-span-2 space-y-8">
          {/* Live Stage Status */}
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                <h2 className="text-base font-bold text-white tracking-tight">Main Pitch Stage</h2>
              </div>
              <Badge variant="live">LIVE OFFICIAL STATUS</Badge>
            </div>

            {stage?.current_presentation ? (
              <div className="p-5 rounded-xl bg-[#121214] border border-rose-500/30">
                <div className="text-xs font-bold text-rose-400 tracking-wider uppercase mb-1">
                  Currently on Stage
                </div>
                <div className="text-xl font-extrabold text-white">
                  {stage.current_presentation.team_name}
                </div>
                <div className="text-sm text-neutral-300 mt-0.5">
                  {stage.current_presentation.project_title}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="w-3.5 h-3.5" /> Presentation in progress
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[#1c1c1e] border border-white/[0.08] text-center text-sm text-neutral-500">
                Stage is currently on intermission or preparing the next pitch team.
              </div>
            )}

            {/* Upcoming Next */}
            {stage?.upcoming_presentations?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  Up Next on Deck
                </div>
                <div className="space-y-2">
                  {stage.upcoming_presentations.slice(0, 2).map((up: any) => (
                    <div key={up.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1e] border border-white/[0.06]">
                      <div>
                        <div className="text-sm font-bold text-neutral-200">{up.team_name}</div>
                        <div className="text-xs text-neutral-400">{up.project_title}</div>
                      </div>
                      <span className="text-xs font-semibold text-neutral-200 bg-white/[0.05] px-2.5 py-1 rounded-md border border-white/60/20">
                        Slot #{up.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Event Notices */}
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-neutral-200" />
                <h2 className="text-base font-bold text-white tracking-tight">Event Announcements</h2>
              </div>
              <Link href="/participant/announcements" className="text-xs font-semibold text-neutral-200 hover:underline">
                View All
              </Link>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-neutral-500">No active announcements right now.</p>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-4 rounded-xl bg-[#1c1c1e] border border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-100">{ann.title}</span>
                      <span className="text-[10px] font-semibold text-neutral-400 px-2 py-0.5 rounded-full bg-zinc-800">
                        {ann.priority}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">{ann.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Summary Card */}
        <div className="space-y-6">
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-neutral-200" />
              <h2 className="text-base font-bold text-white tracking-tight">My Ticket Entitlements</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-[#1c1c1e] border border-white/[0.08] text-center">
                <div className="text-2xl font-black text-neutral-200">{availableCount}</div>
                <div className="text-xs font-medium text-neutral-400 mt-1">Available</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1c1e] border border-white/[0.08] text-center">
                <div className="text-2xl font-black text-emerald-400">{redeemedCount}</div>
                <div className="text-xs font-medium text-neutral-400 mt-1">Redeemed</div>
              </div>
            </div>

            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-[#1c1c1e] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-neutral-200">{t.ticket_name}</div>
                    <div className="text-xs text-neutral-500">{t.category} &bull; {t.used_count}/{t.allowed_uses} used</div>
                  </div>
                  <Badge variant={t.status === "AVAILABLE" ? "available" : t.status === "REDEEMED" ? "redeemed" : "info"}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>

            <Link
              href="/participant/tickets"
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-neutral-200 text-xs font-bold transition-all border border-white/[0.1]"
            >
              Open Ticket Presentation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
