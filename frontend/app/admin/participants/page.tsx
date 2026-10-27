"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Users, Search, Users2, ArrowRight } from "lucide-react";

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadParticipants = async () => {
    try {
      const data = await apiRequest("/participants/");
      setParticipants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.registration_code.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.team_name && p.team_name.toLowerCase().includes(search.toLowerCase())) ||
    (p.college && p.college.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Participant Directory</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Synced automatically from Teams roster registrations.
          </p>
        </div>

        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 active:scale-[0.98] text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
        >
          <Users2 className="w-3.5 h-3.5" /> Manage Teams & Import CSV <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, ID, team, or college..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#121214] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Table */}
      <div className="bg-[#121214] rounded-3xl border border-white/[0.08] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-500">Loading participant records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Participants Registered Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Participants are populated directly from team rosters. Import or add teams to automatically register members.
            </p>
            <Link
              href="/admin/teams"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Go to Teams Management
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-neutral-400 font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Registration ID</th>
                  <th className="px-6 py-3.5">Participant Name</th>
                  <th className="px-6 py-3.5">Team</th>
                  <th className="px-6 py-3.5">College</th>
                  <th className="px-6 py-3.5">Account Email</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-white">{p.registration_code}</td>
                    <td className="px-6 py-3.5 font-semibold text-white">{p.name}</td>
                    <td className="px-6 py-3.5 text-neutral-300">
                      {p.team_name ? (
                        <span className="font-medium text-white">{p.team_name}</span>
                      ) : (
                        <span className="text-neutral-500 italic">Individual</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-400">{p.college || "—"}</td>
                    <td className="px-6 py-3.5 text-neutral-400">{p.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={p.is_active ? "available" : "expired"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
