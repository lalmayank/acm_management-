"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { UserCheck, Plus, Mail, Lock, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const loadVolunteers = async () => {
    try {
      const data = await apiRequest("/volunteers/");
      setVolunteers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/volunteers/", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password: password || "volunteer123",
        }),
      });
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPassword("");
      loadVolunteers();
    } catch (err: any) {
      alert(`Error creating volunteer account: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading volunteer personnel...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Volunteer Personnel</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Provision staff accounts for ticket checkpoint validators and stage coordinators.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black text-xs font-semibold transition-all self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" /> Provision Volunteer
        </button>
      </div>

      <div className="bg-[#121214] rounded-3xl border border-white/[0.08] shadow-xl overflow-hidden">
        {volunteers.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 space-y-2">
            <UserCheck className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
            <div className="text-sm font-semibold text-neutral-300">No Volunteer Accounts Provisioned Yet</div>
            <div className="text-xs text-neutral-500">Click "Provision Volunteer" above to create checkpoint staff accounts.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1c1c1e] text-neutral-400 uppercase tracking-wider border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-3.5">Volunteer Staff</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-neutral-300">
                {volunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-bold text-white text-sm">{v.name}</td>
                    <td className="px-6 py-4 font-mono text-neutral-400">{v.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        VOLUNTEER
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={v.is_active ? "available" : "expired"}>
                        {v.is_active ? "ACTIVE" : "DISABLED"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Volunteer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Provision Volunteer Staff Account</h3>
            <p className="text-xs text-neutral-400">
              Volunteers will use these credentials to log in and access the Ticket Validator and Assigned Work tabs.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Checkpoint Lead"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. volunteer@acmsharktank.org"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-xs transition-all"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
