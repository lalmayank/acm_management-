"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { History, Download, ShieldCheck, AlertCircle, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminHistoryPage() {
  const [activeTab, setActiveTab] = useState<"scans" | "audit">("scans");
  const [scans, setScans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [scansData, auditData] = await Promise.all([
          apiRequest("/verification/attempts"),
          apiRequest("/reports/audit-logs"),
        ]);
        setScans(scansData);
        setAuditLogs(auditData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExportCSV = () => {
    if (scans.length === 0) return;
    const headers = ["ID", "Validator", "Ticket Reference", "Outcome", "Reason", "Timestamp"];
    const rows = scans.map((s) => [
      s.id,
      `"${s.validator_name}"`,
      `"${s.ticket_reference}"`,
      s.outcome,
      `"${s.reason || ""}"`,
      s.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `acm_shark_tank_scans_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredScans = scans.filter((s) =>
    s.validator_name.toLowerCase().includes(search.toLowerCase()) ||
    s.outcome.toLowerCase().includes(search.toLowerCase()) ||
    s.ticket_reference.toLowerCase().includes(search.toLowerCase()) ||
    (s.reason && s.reason.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Audit &amp; Operations Log</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative event records: scan outcomes, rejected attempts, and administrative transitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex p-1 rounded-xl bg-[#121214] border border-white/[0.08]">
            <button
              onClick={() => setActiveTab("scans")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "scans" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Scan Attempts
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "audit" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Admin Audit
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-bold border border-white/[0.1] transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {activeTab === "scans" ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by validator, outcome (VALID / ALREADY_REDEEMED), or reference code..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#121214] border border-white/[0.08] rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="bg-[#121214] rounded-3xl border border-white/[0.08] shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-500">Loading audit history...</div>
            ) : filteredScans.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">No scan attempts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1c1c1e] text-neutral-400 uppercase tracking-wider border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-3.5">Outcome</th>
                      <th className="px-6 py-3.5">Validator</th>
                      <th className="px-6 py-3.5">Ticket Reference</th>
                      <th className="px-6 py-3.5">Details / Reason</th>
                      <th className="px-6 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-neutral-300">
                    {filteredScans.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            s.outcome === "VALID"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-950 text-red-400 border border-red-500/30"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.outcome === "VALID" ? "bg-emerald-400" : "bg-red-400"}`} />
                            {s.outcome}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">{s.validator_name}</td>
                        <td className="px-6 py-4 font-mono text-neutral-400">{s.ticket_reference.slice(0, 16)}...</td>
                        <td className="px-6 py-4 text-neutral-400">{s.reason || "Processed successfully"}</td>
                        <td className="px-6 py-4 text-neutral-500">
                          {new Date(s.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* System Audit Log Tab */
        <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-xl space-y-3">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Administrative Audit Trail
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-neutral-500">No administrative audit records logged yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">
                      {log.action} on {log.target_type} ({log.target_id || "global"})
                    </div>
                    <div className="text-neutral-500 mt-0.5">By {log.actor}</div>
                  </div>
                  <div className="text-neutral-500">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
