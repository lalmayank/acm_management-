"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import AirDropAnimation from "@/components/tickets/AirDropAnimation";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function TicketPresentationPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = async () => {
    try {
      const tickets = await apiRequest("/participants/me/tickets");
      const found = tickets.find((t: any) => t.id === ticketId);
      if (found) {
        setTicket(found);
      } else {
        setError("Ticket not found or not allocated to your account.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();

    // Poll every 3 seconds to check if checkpoint volunteer redeemed the ticket
    const interval = setInterval(async () => {
      try {
        const tickets = await apiRequest("/participants/me/tickets");
        const found = tickets.find((t: any) => t.id === ticketId);
        if (found) {
          setTicket(found);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 flex items-center justify-center text-neutral-400 text-xs">
        <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-3" />
        Loading pass...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error || "Ticket not found"}
        </div>
        <Link href="/participant/tickets" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Passes
        </Link>
      </div>
    );
  }

  const isRedeemed = ticket.status === "REDEEMED";

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      {/* Top back bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/participant/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <Badge variant={ticket.status === "AVAILABLE" ? "available" : isRedeemed ? "redeemed" : "info"}>
          {ticket.status}
        </Badge>
      </div>

      {/* Ticket Header Card */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest">
          {ticket.category} PASS
        </span>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{ticket.ticket_name}</h1>
        {ticket.description && <p className="text-xs text-neutral-400 max-w-xs mx-auto">{ticket.description}</p>}
      </div>

      {/* AirDrop Animation & QR Fallback Component */}
      <AirDropAnimation
        secretCode={ticket.secret_code}
        ticketName={ticket.ticket_name}
        isRedeemed={isRedeemed}
      />

      {/* Ticket Entitlement Metadata */}
      <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between text-neutral-400">
          <span>Allowed Check-ins</span>
          <span className="font-medium text-neutral-200">
            {ticket.used_count} of {ticket.allowed_uses} used
          </span>
        </div>
        <div className="flex items-center justify-between text-neutral-400">
          <span>Verification Protocol</span>
          <span className="font-medium text-neutral-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Apple AirDrop & Dynamic Barcode
          </span>
        </div>
      </div>
    </div>
  );
}
