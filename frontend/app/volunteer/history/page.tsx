"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { History, Users, ShieldCheck, CheckCircle2, Clock, ChevronDown, ChevronRight } from "lucide-react";

export default function VolunteerHistoryPage() {
  const [activeTab, setActiveTab] = useState<"activity" | "teamwise">("teamwise");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [teamHistory, setTeamHistory] = useState<any[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [types, attempts] = await Promise.all([
          apiRequest("/tickets/types"),
          apiRequest("/verification/attempts"),
        ]);
        setTicketTypes(types);
        setRecentAttempts(attempts);
        if (types.length > 0) {
          setSelectedTicketType(types[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTeamwise() {
      if (!selectedTicketType) return;
      try {
        const teams = await apiRequest(`/tickets/types/${selectedTicketType}/teams`);
        setTeamHistory(teams);
        // Expand first team by default
        if (teams.length > 0) {
          setExpandedTeams({ [teams[0].team_id]: true });
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTeamwise();
  }, [selectedTicketType]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Audit &amp; Validation History</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative records of scans, checkpoint redemptions, and team entitlement progress.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#121214] border border-white/[0.08] self-start sm:self-center">
          <button
            onClick={() => setActiveTab("teamwise")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "teamwise"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Team-Wise History
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "activity"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Recent Activity Log
          </button>
        </div>
      </div>

      {activeTab === "teamwise" ? (
        /* Team-Wise History View */
        <div className="space-y-6">
          {/* Ticket Type Filter */}
          <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Select Ticket Category:
            </span>
            <select
              value={selectedTicketType}
              onChange={(e) => setSelectedTicketType(e.target.value)}
              className="px-3.5 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-neutral-100 focus:outline-none focus:border-white/30"
            >
              {ticketTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name} ({tt.category})
                </option>
              ))}
            </select>
          </div>

          {teamHistory.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
              No teams have been allocated this ticket type yet.
            </div>
          ) : (
            <div className="space-y-4">
              {teamHistory.map((th) => {
                const isExpanded = !!expandedTeams[th.team_id];
                return (
                  <div
                    key={th.team_id}
                    className="bg-[#121214] rounded-2xl border border-white/[0.08] overflow-hidden shadow-lg transition-all"
                  >
                    {/* Team Header Row */}
                    <div
                      onClick={() => toggleTeam(th.team_id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-neutral-400">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-200" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-base font-bold text-white flex items-center gap-2">
                            {th.team_name}
                            <span className="text-xs font-mono font-normal text-neutral-400">
                              ({th.team_code})
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {th.total_members} Registered Members
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-black text-neutral-200">
                            {th.redeemed_count} / {th.total_members}
                          </div>
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                            Redeemed
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          th.redeemed_count === th.total_members
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : th.redeemed_count > 0
                            ? "bg-white/[0.06] text-neutral-200 border border-white/[0.08]"
                            : "bg-zinc-800 text-neutral-400"
                        }`}>
                          {th.redeemed_count === th.total_members
                            ? "Complete"
                            : th.redeemed_count > 0
                            ? "In Progress"
                            : "0 Scans"}
                        </span>
                      </div>
                    </div>

                    {/* Member Breakdown */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] bg-[#1c1c1e]/40">
                        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                          Individual Member Entitlements
                        </div>
                        <div className="divide-y divide-zinc-800/60">
                          {th.members.map((m: any) => (
                            <div key={m.participant_id} className="py-3 flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-neutral-200">{m.name}</div>
                                <div className="text-xs text-neutral-400">
                                  ID: <span className="font-mono text-neutral-200">{m.registration_code}</span>
                                  {m.last_redeemed_at && (
                                    <> &bull; Scanned: {new Date(m.last_redeemed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by {m.validator_name || "Staff"}</>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs text-neutral-400 font-mono">
                                  {m.used_count}/{m.allowed_uses} uses
                                </span>
                                <Badge variant={m.status === "REDEEMED" ? "redeemed" : m.status === "AVAILABLE" ? "available" : "pending"}>
                                  {m.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Recent Activity Log */
        <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 shadow-lg space-y-3">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Chronological Scan Attempts
          </div>
          {recentAttempts.length === 0 ? (
            <p className="text-xs text-neutral-500">No scan activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        attempt.outcome === "VALID" ? "bg-emerald-400" : "bg-red-400"
                      }`} />
                      {attempt.outcome}
                    </div>
                    <div className="text-neutral-400 mt-0.5">
                      {attempt.reason || "Verification processed"} &bull; Ref: {attempt.ticket_reference.slice(0, 16)}...
                    </div>
                  </div>

                  <div className="text-right text-neutral-500">
                    <div>{new Date(attempt.created_at).toLocaleTimeString()}</div>
                    <div className="text-[11px] text-neutral-400">By {attempt.validator_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
