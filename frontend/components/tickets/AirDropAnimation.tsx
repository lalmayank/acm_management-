"use client";

import React, { useState } from "react";
import { Smartphone, QrCode, ShieldCheck, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface AirDropAnimationProps {
  secretCode: string;
  ticketName: string;
  isRedeemed: boolean;
}

export default function AirDropAnimation({ secretCode, ticketName, isRedeemed }: AirDropAnimationProps) {
  const [showQR, setShowQR] = useState(false);

  if (isRedeemed) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#121214] rounded-3xl border border-white/[0.08] text-center relative overflow-hidden">
        {/* AirDrop Success Ripple Wave */}
        <div className="relative flex items-center justify-center w-52 h-52 mb-4">
          <div className="absolute w-48 h-48 rounded-full border border-emerald-500/20 animate-ping duration-1000 opacity-30" />
          <div className="absolute w-36 h-36 rounded-full border border-emerald-500/30 animate-pulse" />
          <div className="absolute w-24 h-24 rounded-full border border-emerald-500/40 bg-emerald-500/5" />

          {/* Center Apple AirDrop Node */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-white text-black flex flex-col items-center justify-center shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-scale" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            AirDrop Transfer Complete
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight">Pass Verified &amp; Redeemed</h3>
          <p className="text-xs text-neutral-400 max-w-xs mt-1">
            Checkpoint check-in recorded successfully. Enjoy the event!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#121214] rounded-3xl border border-white/[0.08] relative overflow-hidden">
      {!showQR ? (
        /* Apple AirDrop Minimal Proximity View */
        <div className="flex flex-col items-center w-full">
          <div className="relative flex items-center justify-center w-56 h-56 mb-6">
            {/* Subtle Minimal Concentric Rings */}
            <div className="absolute w-52 h-52 rounded-full border border-white/[0.06] animate-ping duration-1000 opacity-40" />
            <div className="absolute w-40 h-40 rounded-full border border-white/[0.09] animate-pulse" />
            <div className="absolute w-28 h-28 rounded-full border border-white/[0.14] bg-white/[0.02]" />

            {/* Apple Center Node */}
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-white text-black flex flex-col items-center justify-center shadow-lg">
              <Smartphone className="w-7 h-7" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-200 text-xs font-medium mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AirDrop Ready
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">Hold Near Checkpoint Scanner</h3>
            <p className="text-xs text-neutral-400 max-w-xs">
              Automatic contactless proximity verification with event staff.
            </p>
          </div>

          <button
            onClick={() => setShowQR(true)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium border border-white/[0.08] transition-all cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-neutral-300" />
            View QR Code Fallback
          </button>
        </div>
      ) : (
        /* Minimalist Dynamic QR Presentation */
        <div className="flex flex-col items-center w-full">
          <div className="p-4 bg-white rounded-2xl mb-4 shadow-sm">
            <QRCodeSVG value={secretCode} size={200} level="H" includeMargin={false} />
          </div>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-neutral-300 text-xs font-medium mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Dynamic Barcode
            </div>
            <p className="text-xs text-neutral-400 max-w-xs">
              Present this barcode directly to the volunteer camera viewfinder.
            </p>
            <div className="mt-2 font-mono text-[11px] text-neutral-500 bg-white/[0.03] px-3 py-1 rounded-lg border border-white/[0.06] inline-block">
              {secretCode.slice(0, 16)}...
            </div>
          </div>

          <button
            onClick={() => setShowQR(false)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium border border-white/[0.08] transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-neutral-300" />
            Switch Back to AirDrop
          </button>
        </div>
      )}
    </div>
  );
}
