"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Megaphone, Plus, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [audience, setAudience] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await apiRequest("/announcements/");
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/announcements/", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          priority,
          audience,
        }),
      });
      setShowAddModal(false);
      setTitle("");
      setBody("");
      loadData();
    } catch (err: any) {
      alert(`Error publishing announcement: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading event announcements...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Broadcast authoritative notices live to participants, volunteers, or all users.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black text-xs font-semibold transition-all self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" /> Broadcast Notice
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div key={ann.id} className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{ann.title}</h3>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Target Audience: <span className="font-semibold text-neutral-200">{ann.audience}</span>
                </div>
              </div>
              <Badge variant={ann.priority === "HIGH" || ann.priority === "URGENT" ? "urgent" : "info"}>
                {ann.priority}
              </Badge>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-[#1c1c1e] p-3.5 rounded-xl border border-white/[0.08]">
              {ann.body}
            </p>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock className="w-3.5 h-3.5" /> Published {new Date(ann.publish_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Broadcast Announcement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Broadcast Announcement</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule delay or lunch reminder"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                >
                  <option value="ALL">Everyone (Participants &amp; Volunteers)</option>
                  <option value="PARTICIPANTS">Participants Only</option>
                  <option value="VOLUNTEERS">Volunteers Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Message Body</label>
                <textarea
                  rows={3}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write clear event message..."
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
                  className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Publish Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
