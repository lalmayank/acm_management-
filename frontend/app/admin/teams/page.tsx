"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Users, Plus, Upload, Building2, User, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Manual creation state
  const [teamName, setTeamName] = useState("");
  const [college, setCollege] = useState("");
  const [members, setMembers] = useState<{ name: string; email: string }[]>([
    { name: "", email: "" },
  ]);
  const [creating, setCreating] = useState(false);

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<any | null>(null);

  const loadTeams = async () => {
    try {
      const data = await apiRequest("/teams/");
      setTeams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleAddMemberRow = () => {
    setMembers((prev) => [...prev, { name: "", email: "" }]);
  };

  const handleMemberChange = (index: number, field: "name" | "email", value: string) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleRemoveMemberRow = (index: number) => {
    if (members.length === 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setCreating(true);
    try {
      const validMembers = members
        .filter((m) => m.name.trim() && m.email.trim())
        .map((m) => ({
          name: m.name.trim(),
          email: m.email.trim(),
          college: college.trim() || undefined,
        }));

      await apiRequest("/teams/", {
        method: "POST",
        body: JSON.stringify({
          name: teamName.trim(),
          college: college.trim() || undefined,
          members_data: validMembers,
        }),
      });

      setShowAddModal(false);
      setTeamName("");
      setCollege("");
      setMembers([{ name: "", email: "" }]);
      loadTeams();
    } catch (err: any) {
      alert(`Error creating team: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setImporting(true);
    setCsvResult(null);

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await apiRequest("/teams/import-csv", {
        method: "POST",
        body: formData,
      });
      setCsvResult(res);
      loadTeams();
    } catch (err: any) {
      alert(`CSV Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex items-center justify-center text-xs text-neutral-500">
        <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading teams directory...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Teams &amp; Pitches</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Startup teams, members, and colleges with auto-generated identification codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvResult(null);
              setCsvFile(null);
              setShowCsvModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium border border-white/[0.08] transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import Teams CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 active:scale-[0.98] text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Register Team
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Teams Registered Yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Upload a CSV containing your event teams and members or add a team manually.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium border border-white/[0.08] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="bg-[#121214] rounded-3xl border border-white/[0.08] p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-neutral-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                      {t.team_code}
                    </span>
                    {t.college && (
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-neutral-500" /> {t.college}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-neutral-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    {t.members?.length || 0} Members
                  </span>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
                <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Team Members
                </div>
                {t.members?.length === 0 ? (
                  <div className="text-xs text-neutral-500 italic">No members assigned yet.</div>
                ) : (
                  <div className="space-y-1">
                    {t.members.map((m: any, idx: number) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/[0.06] text-neutral-300 flex items-center justify-center text-[10px] font-semibold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-[11px] text-neutral-400">{m.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[11px] text-neutral-300">{m.registration_code}</span>
                          {m.college && <div className="text-[10px] text-neutral-500">{m.college}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register Team Manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-white">Register New Team</h3>
              <p className="text-xs text-neutral-400">Team code will be generated automatically based on the team name.</p>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Apex Robotics"
                  className="w-full px-3.5 py-2.5 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  College / Institution Name
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Harvard School of Engineering"
                  className="w-full px-3.5 py-2.5 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Members Inputs */}
              <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Team Members ({members.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMemberRow}
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>

                <div className="space-y-2">
                  {members.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Member #{idx + 1} {idx === 0 && "(Team Leader)"}</span>
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberRow(idx)}
                            className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={m.name}
                          onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                          placeholder="Full Name"
                          className="px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                        />
                        <input
                          type="email"
                          required
                          value={m.email}
                          onChange={(e) => handleMemberChange(idx, "email", e.target.value)}
                          placeholder="Email Address"
                          className="px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
                >
                  {creating ? "Saving Team..." : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Import Teams via CSV</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Upload your CSV file to batch-register teams and participants.
              </p>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[11px] text-neutral-400 space-y-1">
              <span className="font-medium text-neutral-300">Expected CSV Headers:</span>
              <pre className="font-mono text-[10px] text-neutral-200 bg-black/40 p-2 rounded border border-white/[0.06] overflow-x-auto">
                team_name,college,member_name,member_email,phone
              </pre>
              <p className="text-[10px] text-neutral-500">
                Multiple rows with the same team name are automatically grouped into one team.
              </p>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black hover:file:bg-neutral-200 cursor-pointer"
              />

              {csvResult && (
                <div className="p-3 bg-[#1c1c1e] rounded-xl border border-white/[0.08] text-xs space-y-1">
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Successfully created {csvResult.teams_created} teams with {csvResult.members_created} members!
                  </div>
                  {csvResult.errors?.length > 0 && (
                    <div className="text-rose-400 max-h-24 overflow-y-auto text-[11px] pt-1">
                      {csvResult.errors.map((err: string, i: number) => (
                        <div key={i}>&bull; {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || importing}
                  className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 text-black font-semibold text-xs transition-all cursor-pointer"
                >
                  {importing ? "Importing..." : "Upload & Create Teams"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
