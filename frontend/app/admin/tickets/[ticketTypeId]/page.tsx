"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ChevronDown, ChevronRight, ShieldAlert, CheckCircle2, Users, Download } from "lucide-react";

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketTypeId = params?.ticketTypeId as string;

  const [ticketType, setTicketType] = useState<any>(null);
  const [teamHistory, setTeamHistory] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [types, teams] = await Promise.all([
        apiRequest("/tickets/types"),
        apiRequest(`/tickets/types/${ticketTypeId}/teams`),
      ]);
      const found = types.find((t: any) => t.id === ticketTypeId);
      setTicketType(found);
      setTeamHistory(teams);
      if (teams.length > 0) {
        setExpandedTeams({ [teams[0].team_id]: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ticketTypeId]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleRevoke = async (entitlementId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to revoke this pass for ${memberName}?`)) return;
    try {
      await apiRequest(`/tickets/entitlements/${entitlementId}/revoke`, {
        method: "POST",
      });
      loadData();
    } catch (err: any) {
      alert(`Error revoking pass: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading team-wise audit report...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Ticket Types
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {ticketType?.name || "Ticket Audit"}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Category: <span className="text-neutral-200 font-semibold">{ticketType?.category}</span> &bull; Team-wise redemption completion rates.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] text-center">
          <div className="text-3xl font-black text-white">{ticketType?.total_entitlements || 0}</div>
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">Total Entitlements</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] text-center">
          <div className="text-3xl font-black text-emerald-400">{ticketType?.total_redeemed || 0}</div>
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">Successful Redemptions</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] text-center">
          <div className="text-3xl font-black text-neutral-200">{ticketType?.total_pending || 0}</div>
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-1">Pending Passes</div>
        </div>
      </div>

      {/* Team-Wise Inspection */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Team-Wise Breakdown</h2>

        {teamHistory.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
            No teams have been issued this ticket type yet.
          </div>
        ) : (
          <div className="space-y-4">
            {teamHistory.map((th) => {
              const isExpanded = !!expandedTeams[th.team_id];
              return (
                <div key={th.team_id} className="bg-[#121214] rounded-2xl border border-white/[0.08] overflow-hidden shadow-lg">
                  {/* Team Row Header */}
                  <div
                    onClick={() => toggleTeam(th.team_id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-neutral-400">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-200" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-base font-bold text-white flex items-center gap-2">
                          {th.team_name}
                          <span className="text-xs font-mono font-normal text-neutral-400">({th.team_code})</span>
                        </div>
                        <div className="text-xs text-neutral-400">{th.total_members} Registered Members</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-black text-neutral-200">{th.redeemed_count} / {th.total_members}</div>
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Redeemed</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        th.redeemed_count === th.total_members
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : th.redeemed_count > 0
                          ? "bg-white/[0.06] text-neutral-200 border border-white/[0.08]"
                          : "bg-white/[0.06] text-neutral-400"
                      }`}>
                        {th.redeemed_count === th.total_members ? "All Redeemed" : `${th.pending_count} Pending`}
                      </span>
                    </div>
                  </div>

                  {/* Individual Member List */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] bg-[#1c1c1e]/40">
                      <div className="divide-y divide-white/[0.04]">
                        {th.members.map((m: any) => (
                          <div key={m.participant_id} className="py-3.5 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-neutral-200">{m.name}</div>
                              <div className="text-xs text-neutral-400">
                                Reg ID: <span className="font-mono text-neutral-200">{m.registration_code}</span>
                                {m.last_redeemed_at && (
                                  <> &bull; Redeemed at {new Date(m.last_redeemed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by {m.validator_name || "Staff"}</>
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

                              {m.entitlement_id && m.status !== "REVOKED" && (
                                <button
                                  onClick={() => handleRevoke(m.entitlement_id, m.name)}
                                  className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline px-2 py-1 rounded"
                                >
                                  Revoke
                                </button>
                              )}
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
    </div>
  );
}
