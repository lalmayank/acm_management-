"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Ticket, Plus, Users, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminTicketsPage() {
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Create form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [allowedUses, setAllowedUses] = useState(1);

  // Issue form fields
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [qtyPerMember, setQtyPerMember] = useState(1);
  const [issueLoading, setIssueLoading] = useState(false);

  const loadData = async () => {
    try {
      const [types, teamsData] = await Promise.all([
        apiRequest("/tickets/types"),
        apiRequest("/teams/"),
      ]);
      setTicketTypes(types);
      setTeams(teamsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTicketType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/tickets/types", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          category,
          allowed_uses_per_member: Number(allowedUses),
        }),
      });
      setShowCreateModal(false);
      setName("");
      setDescription("");
      loadData();
    } catch (err: any) {
      alert(`Error creating ticket type: ${err.message}`);
    }
  };

  const openIssueModal = (tt: any) => {
    setSelectedTicketType(tt);
    setSelectedTeamIds(teams.map((t) => t.id)); // select all teams by default
    setShowIssueModal(true);
  };

  const handleIssueTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketType) return;
    setIssueLoading(true);

    try {
      const res = await apiRequest(`/tickets/types/${selectedTicketType.id}/issue`, {
        method: "POST",
        body: JSON.stringify({
          team_ids: selectedTeamIds,
          participant_ids: [],
          quantity_per_member: Number(qtyPerMember),
        }),
      });
      alert(`Issuance Successful! Created ${res.summary.created_entitlements} individual member entitlements.`);
      setShowIssueModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to issue tickets: ${err.message}`);
    } finally {
      setIssueLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading ticket engine...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Ticket Engine &amp; Entitlements</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Define generic ticket types, perform bulk team issuance, and inspect team-wise redemption rates.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-xs transition-all shadow-lg shadow-sm transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Create Ticket Type
        </button>
      </div>

      {/* Ticket Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ticketTypes.map((tt) => (
          <div
            key={tt.id}
            className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-white/[0.1] transition-all"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 bg-white/[0.06] border border-white/[0.1] px-2.5 py-0.5 rounded-full">
                  {tt.category}
                </span>
                <Badge variant={tt.is_active ? "available" : "expired"}>
                  {tt.is_active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                  {tt.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  {tt.description || "Event ticket pass for ACM Shark Tank activities."}
                </p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.08] text-center">
                <div className="p-2 rounded-xl bg-[#1c1c1e]">
                  <div className="text-lg font-black text-white">{tt.total_entitlements}</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Allocated</div>
                </div>
                <div className="p-2 rounded-xl bg-[#1c1c1e]">
                  <div className="text-lg font-black text-emerald-400">{tt.total_redeemed}</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Redeemed</div>
                </div>
                <div className="p-2 rounded-xl bg-[#1c1c1e]">
                  <div className="text-lg font-black text-neutral-200">{tt.total_pending}</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Pending</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => openIssueModal(tt)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.08] text-xs font-bold transition-all text-center"
              >
                Issue to Teams
              </button>
              <Link
                href={`/admin/tickets/${tt.id}`}
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.1] text-xs font-bold transition-all flex items-center justify-center"
                title="View Team-Wise Audit"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Ticket Type */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Ticket Type</h3>
            <form onSubmit={handleCreateTicketType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Ticket Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lunch Pass, Entry Pass"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="FOOD">FOOD / LUNCH</option>
                  <option value="ENTRY">VENUE ENTRY</option>
                  <option value="WORKSHOP">WORKSHOP</option>
                  <option value="PITCH">PITCH PASS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for attendees..."
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Allowed Uses Per Member</label>
                <input
                  type="number"
                  min="1"
                  value={allowedUses}
                  onChange={(e) => setAllowedUses(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-xs transition-all"
                >
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Tickets */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              Issue "{selectedTicketType?.name}" to Teams
            </h3>
            <p className="text-xs text-neutral-400">
              The backend creates 1 entitlement per eligible team member.
            </p>

            <form onSubmit={handleIssueTickets} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2">Select Teams to Issue Pass:</label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-[#121214] rounded-lg cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeamIds([...selectedTeamIds, t.id]);
                          } else {
                            setSelectedTeamIds(selectedTeamIds.filter((id) => id !== t.id));
                          }
                        }}
                        className="rounded bg-[#121214] border-white/[0.1] text-white focus:ring-0"
                      />
                      <span className="font-bold text-neutral-200">{t.name}</span>
                      <span className="text-neutral-500">({t.members?.length || 0} members)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Uses Per Team Member</label>
                <input
                  type="number"
                  min="1"
                  value={qtyPerMember}
                  onChange={(e) => setQtyPerMember(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoading || selectedTeamIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 text-black font-semibold text-xs transition-all"
                >
                  {issueLoading ? "Issuing..." : "Confirm & Issue Entitlements"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
