"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { History, ShieldCheck, Clock, CheckCircle } from "lucide-react";

export default function ParticipantHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest("/participants/me/history");
        setHistory(data);
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
        Loading your redemption history...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Redemption History</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Audited log of your personal ticket scans and checkpoint redemptions.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
          No redemptions recorded for your account yet.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-[#121214] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{item.ticket_name}</div>
                  <div className="text-xs text-neutral-400">
                    Use #{item.use_number} &bull; Verified by {item.validator_name}
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-neutral-400">
                <div className="font-medium text-neutral-300">
                  {new Date(item.redeemed_at).toLocaleDateString()}
                </div>
                <div>
                  {new Date(item.redeemed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
