"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Megaphone, Search, AlertCircle, Clock, Pin } from "lucide-react";

export default function VolunteerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "URGENT" | "NORMAL">("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiRequest("/announcements/");
        setAnnouncements(data);
      } catch (err) {
        console.error("Failed to load announcements", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = announcements.filter((a) => {
    const matchFilter = filter === "ALL" ? true : a.priority === filter;
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.body.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Event Announcements</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Official operational broadcast alerts from lead organizers.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121214] border border-white/[0.08] rounded-full self-start sm:self-auto">
          {(["ALL", "URGENT", "NORMAL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filter === tab
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "URGENT" ? "Urgent" : "Standard"}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#121214] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="p-16 flex items-center justify-center text-xs text-neutral-500">
          <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
          Loading announcements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-12 text-center space-y-2">
          <Megaphone className="w-8 h-8 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Announcements Available</h3>
          <p className="text-xs text-neutral-400">
            {search || filter !== "ALL"
              ? "No announcements match your search criteria."
              : "No announcements have been published by organizers yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => (
            <div
              key={ann.id}
              className={`bg-[#121214] rounded-2xl border p-5 space-y-2.5 transition-colors ${
                ann.priority === "URGENT" ? "border-rose-500/30" : "border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ann.is_pinned && <Pin className="w-3.5 h-3.5 text-neutral-300" />}
                  <h3 className="text-sm font-semibold text-white tracking-tight">{ann.title}</h3>
                </div>
                <Badge variant={ann.priority === "URGENT" ? "urgent" : "info"}>
                  {ann.priority}
                </Badge>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">{ann.body}</p>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ann.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {ann.author_name && <span>By {ann.author_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
