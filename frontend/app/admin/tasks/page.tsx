"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { CheckSquare, Plus, Clock, Users, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [selectedVolIds, setSelectedVolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tasksData, volsData] = await Promise.all([
        apiRequest("/tasks/my"),
        apiRequest("/volunteers/"),
      ]);
      setTasks(tasksData);
      setVolunteers(volsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/tasks/", {
        method: "POST",
        body: JSON.stringify({
          title,
          instructions,
          priority,
          assigned_user_ids: selectedVolIds,
        }),
      });
      setShowAddModal(false);
      setTitle("");
      setInstructions("");
      setSelectedVolIds([]);
      loadData();
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading operational task board...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Assigned Work &amp; Tasks</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Delegate checkpoint, stage, and logistics tasks to volunteer personnel.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-black text-xs font-semibold transition-all self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" /> Assign New Task
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{task.title}</h3>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Assigned Staff: {task.assigned_volunteers?.join(", ") || "All Volunteers"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300">
                  {task.priority}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  task.status === "COMPLETED" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                }`}>
                  {task.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 bg-[#1c1c1e] p-3 rounded-xl border border-white/[0.08]">
              {task.instructions}
            </p>
          </div>
        ))}
      </div>

      {/* Modal: Create Task */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Operational Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Check podium wireless mic battery"
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
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
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific checkpoint steps..."
                  className="w-full px-3 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Assign Volunteers</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
                  {volunteers.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-[#121214] rounded">
                      <input
                        type="checkbox"
                        checked={selectedVolIds.includes(v.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedVolIds([...selectedVolIds, v.id]);
                          else setSelectedVolIds(selectedVolIds.filter((id) => id !== v.id));
                        }}
                        className="rounded bg-[#121214] border-white/[0.1] text-white"
                      />
                      <span className="text-neutral-200">{v.name}</span>
                    </label>
                  ))}
                </div>
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
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
