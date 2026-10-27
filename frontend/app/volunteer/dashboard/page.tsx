"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Radio, CheckSquare, ShieldCheck, ArrowRight, Clock, Users, Megaphone, Pin } from "lucide-react";

export default function VolunteerDashboard() {
  const [stage, setStage] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [stageData, tasksData, annData] = await Promise.all([
          apiRequest("/stage/current"),
          apiRequest("/tasks/my"),
          apiRequest("/announcements/"),
        ]);
        setStage(stageData);
        setTasks(tasksData);
        setAnnouncements(annData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const interval = setInterval(async () => {
      try {
        const s = await apiRequest("/stage/current");
        setStage(s);
      } catch {}
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex items-center justify-center text-xs text-neutral-500">
        <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Connecting to Event Operations Hub...
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#121214] border border-white/[0.08] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-200 text-xs font-medium mb-2">
            <Radio className="w-3.5 h-3.5" /> Volunteer Operations Hub
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Event Operations</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Realtime stage status, volunteer assignments, broadcast announcements, and pass validation.
          </p>
        </div>

        <Link
          href="/volunteer/validate"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs transition-all self-start sm:self-center cursor-pointer"
        >
          <Radio className="w-4 h-4" />
          Launch Validator
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Official Stage & Announcements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Card */}
          <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-white tracking-tight">Pitch Stage Status</h2>
              </div>
              <Badge variant="live">LIVE STATUS</Badge>
            </div>

            {stage?.current_presentation ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                  Currently on Stage
                </div>
                <div className="text-lg font-semibold text-white">
                  {stage.current_presentation.team_name}
                </div>
                <div className="text-xs text-neutral-400">
                  {stage.current_presentation.project_title}
                </div>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500">
                  <Clock className="w-3 h-3" /> Slot #{stage.current_presentation.position}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] text-center text-xs text-neutral-500">
                Stage is currently on intermission or waiting for the next team.
              </div>
            )}

            {/* Upcoming Queue */}
            {stage?.upcoming_presentations?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
                  Up Next on Deck
                </div>
                <div className="space-y-2">
                  {stage.upcoming_presentations.map((up: any) => (
                    <div key={up.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div>
                        <div className="text-xs font-semibold text-white">{up.team_name}</div>
                        <div className="text-[11px] text-neutral-400">{up.project_title}</div>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-300 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                        #{up.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Broadcast Announcements Preview */}
          <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-tight">Latest Announcements</h2>
              </div>
              <Link
                href="/volunteer/announcements"
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-neutral-500">No active announcements right now.</p>
            ) : (
              <div className="space-y-2.5">
                {announcements.slice(0, 3).map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-3.5 rounded-2xl bg-white/[0.02] border ${
                      ann.priority === "URGENT" ? "border-rose-500/30" : "border-white/[0.06]"
                    } space-y-1`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {ann.is_pinned && <Pin className="w-3 h-3 text-neutral-400" />}
                        <span className="text-xs font-semibold text-white">{ann.title}</span>
                      </div>
                      <Badge variant={ann.priority === "URGENT" ? "urgent" : "info"}>
                        {ann.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2">{ann.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Assigned Work Card */}
        <div className="space-y-6">
          <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-tight">Assigned Work</h2>
              </div>
              <span className="text-[11px] font-medium text-neutral-300 bg-white/[0.06] border border-white/[0.1] px-2 py-0.5 rounded-full">
                {pendingTasks.length} Pending
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs text-neutral-500">No tasks currently assigned to you.</p>
            ) : (
              <div className="space-y-2.5">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white line-clamp-1">{task.title}</div>
                      <Badge variant={task.status === "COMPLETED" ? "available" : "pending"}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2">{task.instructions}</p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/volunteer/assigned-work"
              className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium transition-all border border-white/[0.08]"
            >
              Manage Tasks &amp; Status <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
