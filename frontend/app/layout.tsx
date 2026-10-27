import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "ACM Shark Tank — Event Operations",
  description: "Unified operations platform for participants, volunteers, and organizers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black text-[#f5f5f7] antialiased">
      <body className="min-h-screen flex flex-col bg-black selection:bg-white/20 selection:text-white">
        <Suspense fallback={<div className="h-14 border-b border-white/[0.08] bg-black" />}>
          <Navbar />
        </Suspense>
        <Suspense fallback={<div className="p-8 text-center text-neutral-500 text-xs">Loading...</div>}>
          <main className="flex-1 pb-24 md:pb-8">{children}</main>
        </Suspense>
      </body>
    </html>
  );
}
