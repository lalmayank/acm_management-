"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Radio, ArrowRight, Play, CheckCircle, Clock, Plus, Pause, AlertCircle } from "lucide-react";

export default function AdminStagePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [stageState, setStageState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [newPosition, setNewPosition] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStageData = async () => {
    try {
      const [schedData, stateData, teamsData] = await Promise.all([
        apiRequest("/stage/schedule"),
        apiRequest("/stage/current"),
        apiRequest("/teams/"),
      ]);
      setSchedule(schedData);
      setStageState(stateData);
      setTeams(teamsData);
      if (schedData.length > 0) {
        setNewPosition(schedData.length + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStageData();
  }, []);

  const handleTransition = async (action: string, targetId?: string) => {
    setActionLoading(true);
    try {
      await apiRequest("/stage/transition", {
        method: "POST",
        body: JSON.stringify({
          action,
          target_presentation_id: targetId || undefined,
        }),
      });
      await loadStageData();
    } catch (err: any) {
      alert(`Stage transition failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    try {
      await apiRequest("/stage/schedule", {
        method: "POST",
        body: JSON.stringify({
          team_id: selectedTeamId,
          position: Number(newPosition),
          organizer_notes: notes || undefined,
        }),
      });
      setSelectedTeamId("");
      setNotes("");
      loadStageData();
    } catch (err: any) {
      alert(`Failed to add presentation: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Syncing stage controller...
      </div>
    );
  }

  const currentPres = stageState?.current_presentation;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> LIVE STAGE CONTROLLER
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Stage &amp; Presentation Schedule</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative stage sequence. Transitions broadcast in real-time across participant and volunteer screens.
          </p>
        </div>

        {/* 1-Click Advance Button */}
        <button
          onClick={() => handleTransition("NEXT")}
          disabled={actionLoading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-600/25 transition-all self-start sm:self-center disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" /> Advance to Next Pitch
        </button>
      </div>

      {/* Currently On Stage Live Banner */}
      <div className="p-6 rounded-3xl bg-[#121214] border border-white/[0.08] shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            Currently On Stage (Active Session)
          </span>
          <span className="text-xs font-mono text-neutral-500">Stage Version #{stageState?.version}</span>
        </div>

        {currentPres ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <div className="text-2xl font-black text-white">{currentPres.team_name}</div>
              <div className="text-sm text-neutral-300 mt-0.5">{currentPres.project_title}</div>
              {currentPres.organizer_notes && (
                <div className="text-xs text-amber-400/90 mt-2 bg-amber-950/30 px-3 py-1 rounded-md border border-amber-500/20 inline-block">
                  Organizer note: {currentPres.organizer_notes}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => handleTransition("COMPLETE")}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 font-semibold text-xs border border-white/[0.1] transition-all"
              >
                Mark Pitch Completed
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-neutral-500">
            Stage is in intermission. Click "Activate" on any upcoming team below or click "Advance to Next Pitch".
          </div>
        )}
      </div>

      {/* Presentation Schedule List */}
      <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">Presentation Lineup</h2>

        {schedule.length === 0 ? (
          <p className="text-xs text-neutral-500">No teams scheduled yet. Add presentations using the form below.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {schedule.map((pres) => {
              const isOnStage = pres.id === currentPres?.id;
              return (
                <div key={pres.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#1c1c1e] border border-white/[0.08] flex items-center justify-center font-mono font-bold text-sm text-neutral-300 shrink-0">
                      #{pres.position}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {pres.team_name}
                        {isOnStage && <Badge variant="live">ON STAGE</Badge>}
                        {pres.status === "COMPLETED" && <Badge variant="redeemed">COMPLETED</Badge>}
                      </div>
                      <div className="text-xs text-neutral-400">{pres.project_title}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isOnStage && pres.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleTransition("ACTIVATE", pres.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.08] text-xs font-semibold transition-all"
                      >
                        Set to On Stage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Presentation to Schedule Form */}
      <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Add Team to Presentation Schedule
        </h3>

        <form onSubmit={handleAddPresentation} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Select Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/30"
            >
              <option value="">-- Choose Team --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.project_title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Queue Position</label>
            <input
              type="number"
              min="1"
              value={newPosition}
              onChange={(e) => setNewPosition(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/30 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!selectedTeamId}
              className="w-full py-2 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 text-black font-semibold text-xs transition-all"
            >
              Add to Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
