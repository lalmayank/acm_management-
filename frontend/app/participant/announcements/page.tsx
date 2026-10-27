"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Megaphone, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function ParticipantAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest("/announcements/");
        setAnnouncements(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading event announcements...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Official real-time updates and schedule notices from event organizers.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
          No announcements published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{ann.title}</h3>
                <Badge variant={ann.priority === "HIGH" || ann.priority === "URGENT" ? "urgent" : "info"}>
                  {ann.priority}
                </Badge>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">{ann.body}</p>
              <div className="pt-2 flex items-center gap-2 text-xs text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                Published {new Date(ann.publish_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
