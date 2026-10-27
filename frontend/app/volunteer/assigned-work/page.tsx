"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { CheckSquare, Clock, AlertTriangle, CheckCircle, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AssignedWorkPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const data = await apiRequest("/tasks/my");
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await apiRequest(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadTasks();
    } catch (err: any) {
      alert(`Error updating task status: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading your assigned tasks...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Assigned Work</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Operational duties, checkpoint logistics, and stage coordination tasks.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
          No active tasks assigned to you right now. Check with the Head Organizer if you need duty assignments.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="p-5 rounded-2xl bg-[#121214] border border-white/[0.08] shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">{task.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    Due: {task.due_at ? new Date(task.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-neutral-300">
                    Priority: {task.priority}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    task.status === "COMPLETED"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                      : task.status === "IN_PROGRESS"
                      ? "bg-blue-950 text-blue-400 border border-blue-500/30"
                      : task.status === "BLOCKED"
                      ? "bg-red-950 text-red-400 border border-red-500/30"
                      : "bg-zinc-800 text-neutral-400"
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 bg-[#1c1c1e] p-3.5 rounded-xl border border-white/[0.06] leading-relaxed">
                {task.instructions}
              </p>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-xs text-neutral-500 mr-2">Update Status:</span>
                <button
                  onClick={() => handleStatusUpdate(task.id, "PENDING")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    task.status === "PENDING"
                      ? "bg-zinc-800 text-white border-zinc-600"
                      : "border-white/[0.08] text-neutral-400 hover:bg-zinc-800"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    task.status === "IN_PROGRESS"
                      ? "bg-blue-950 text-blue-300 border-blue-500/50"
                      : "border-white/[0.08] text-neutral-400 hover:bg-zinc-800"
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleStatusUpdate(task.id, "COMPLETED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    task.status === "COMPLETED"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                      : "border-white/[0.08] text-neutral-400 hover:bg-zinc-800"
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => handleStatusUpdate(task.id, "BLOCKED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    task.status === "BLOCKED"
                      ? "bg-red-950 text-red-300 border-red-500/50"
                      : "border-white/[0.08] text-neutral-400 hover:bg-zinc-800"
                  }`}
                >
                  Blocked
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
