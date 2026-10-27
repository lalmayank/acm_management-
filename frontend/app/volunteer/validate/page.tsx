"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  CheckCircle2,
  XCircle,
  Camera,
  CameraOff,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function ValidateTicketsPage() {
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRegionId = "qr-reader-viewfinder";

  useEffect(() => {
    async function loadTypes() {
      try {
        const types = await apiRequest("/tickets/types");
        setTicketTypes(types);
      } catch (err) {
        console.error("Failed to load ticket types", err);
      }
    }
    loadTypes();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Audio feedback helper
  const playAudioFeedback = (success: boolean) => {
    try {
      if (typeof window === "undefined" || !window.AudioContext) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        if (navigator.vibrate) navigator.vibrate([250]);
      }
    } catch {}
  };

  const startCamera = async () => {
    setCameraError(null);
    setResult(null);

    try {
      const qrCode = new Html5Qrcode(qrReaderRegionId);
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText) => {
          if (qrCode.isScanning) {
            await qrCode.stop();
          }
          setCameraActive(false);
          await handleValidation(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err?.message || "Camera access denied or camera not found on this device.");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
    }
    setCameraActive(false);
  };

  const handleValidation = async (codeToVerify: string) => {
    const code = codeToVerify.trim();
    if (!code) return;

    setLoading(true);
    setResult(null);

    const idempotencyKey = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await apiRequest("/verification/qr", {
        method: "POST",
        body: JSON.stringify({
          ticket_reference: code,
          ticket_type_id: selectedTicketType || undefined,
          idempotency_key: idempotencyKey,
        }),
      });

      const isSuccess = res.outcome === "VALID";
      playAudioFeedback(isSuccess);

      setResult(res);
      setRecentScans((prev) => [
        {
          code: code.slice(0, 8),
          outcome: res.outcome,
          participant: res.participant_name || "Unknown",
          ticket: res.ticket_name || "Pass",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
        ...prev.slice(0, 4),
      ]);
      setManualCode("");
    } catch (err: any) {
      playAudioFeedback(false);
      setResult({
        outcome: "VERIFICATION_FAILED",
        message: err.message || "Failed to contact verification engine.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReadyNext = () => {
    setResult(null);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-white">Ticket Validator</h1>
        <p className="text-xs text-neutral-400">
          Scan attendee passes or manually verify cryptographic tokens.
        </p>
      </div>

      {/* Target Category Filter */}
      <div className="flex items-center gap-2 p-3 bg-[#121214] rounded-2xl border border-white/[0.08]">
        <label className="text-xs font-medium text-neutral-400 whitespace-nowrap">
          Filter Pass:
        </label>
        <select
          value={selectedTicketType}
          onChange={(e) => setSelectedTicketType(e.target.value)}
          className="flex-1 bg-[#1c1c1e] border border-white/[0.08] text-neutral-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-white/20"
        >
          <option value="">All Categories (Auto-Detect)</option>
          {ticketTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.category})
            </option>
          ))}
        </select>
      </div>

      {/* Main Validation Card */}
      <div className="bg-[#121214] rounded-3xl border border-white/[0.08] p-6 shadow-sm">
        {result ? (
          <div className="space-y-5 text-center py-4">
            <div className="flex justify-center">
              {result.outcome === "VALID" ? (
                <div className="relative flex items-center justify-center w-36 h-36">
                  <div className="absolute w-36 h-36 rounded-full border border-emerald-500/20 animate-ping duration-1000 opacity-40" />
                  <div className="absolute w-28 h-28 rounded-full border border-emerald-500/30 animate-pulse" />
                  <div className="absolute w-20 h-20 rounded-full border border-emerald-500/40 bg-emerald-500/10" />
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <XCircle className="w-9 h-9" />
                </div>
              )}
            </div>

            <div>
              <h2
                className={`text-xl font-semibold tracking-tight ${
                  result.outcome === "VALID" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.outcome === "VALID" ? "Approved" : result.outcome.replace(/_/g, " ")}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">{result.message}</p>
            </div>

            {/* Attendee Details */}
            {result.participant_name && (
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-xs space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Attendee:</span>
                  <span className="font-semibold text-white">{result.participant_name}</span>
                </div>
                {result.registration_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Reg ID:</span>
                    <span className="font-mono text-neutral-300">{result.registration_code}</span>
                  </div>
                )}
                {result.team_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Team:</span>
                    <span className="font-medium text-neutral-200">{result.team_name}</span>
                  </div>
                )}
                {result.ticket_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Pass Type:</span>
                    <span className="font-medium text-neutral-200">{result.ticket_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-neutral-400">Check-in Usage:</span>
                  <span className="font-medium text-white">
                    {result.used_count} of {result.allowed_uses} used
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleReadyNext}
              className="w-full py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              Ready for Next Attendee
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-black ${cameraActive ? "block" : "hidden"}`}>
              <div id={qrReaderRegionId} className="w-full max-w-sm mx-auto" />
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs">
                {cameraError}
              </div>
            )}

            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="w-full py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-[0.98] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Launch Camera Scanner
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="w-full py-2 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 font-medium text-xs border border-white/[0.08] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CameraOff className="w-3.5 h-3.5 text-neutral-400" />
                Close Camera
              </button>
            )}

            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Manual Token / Barcode Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste or enter ticket code..."
                  onKeyDown={(e) => e.key === "Enter" && handleValidation(manualCode)}
                  className="flex-1 px-3.5 py-2 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                  onClick={() => handleValidation(manualCode)}
                  disabled={loading || !manualCode.trim()}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {loading ? "Checking..." : "Verify"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {recentScans.length > 0 && (
        <div className="bg-[#121214] rounded-2xl border border-white/[0.08] p-4 space-y-2.5">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Recent Scans
          </div>
          <div className="space-y-1.5">
            {recentScans.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.outcome === "VALID" ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span className="font-medium text-neutral-200">{s.participant}</span>
                  <span className="text-neutral-500">({s.ticket})</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
