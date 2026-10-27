"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Ticket, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

export default function ParticipantTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await apiRequest("/participants/me/tickets");
        setTickets(data);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center text-neutral-500">
        <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Retrieving your tickets...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Tickets</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Every pass allocated to you individually or issued through your team.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#121214] border border-white/[0.08] text-center text-sm text-neutral-400">
          No tickets have been allocated to your account yet. Check back once registration check-in opens.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((t) => {
            const isAvailable = t.status === "AVAILABLE" || t.status === "PARTIALLY_USED";
            return (
              <div
                key={t.id}
                className="bg-[#121214] rounded-2xl border border-white/[0.08] p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/[0.1] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 bg-white/[0.06] border border-white/[0.1] px-2.5 py-0.5 rounded-full">
                      {t.category}
                    </span>
                    <Badge variant={t.status === "AVAILABLE" ? "available" : t.status === "REDEEMED" ? "redeemed" : "info"}>
                      {t.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                      {t.ticket_name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                      {t.description || "Official pass for ACM Shark Tank event activity."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                    <span>Usage:</span>
                    <span className="font-semibold text-neutral-200">{t.used_count} of {t.allowed_uses} uses</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/participant/tickets/${t.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      isAvailable
                        ? "bg-white hover:bg-neutral-200 text-black shadow-sm"
                        : "bg-zinc-800 hover:bg-zinc-700 text-neutral-300 border border-white/[0.1]"
                    }`}
                  >
                    {isAvailable ? "Present Ticket" : "View Ticket Details"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
