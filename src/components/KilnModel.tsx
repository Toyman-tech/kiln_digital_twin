"use client";

import React from "react";
import { KilnZone } from "@/utils/mockData";
import { Flame, Wifi, Activity, ShieldAlert, Cpu } from "lucide-react";

interface KilnModelProps {
  zones: KilnZone[];
  selectedZoneId: number;
  onSelectZone: (id: number) => void;
  rpm: number;
}

export default function KilnModel({
  zones,
  selectedZoneId,
  onSelectZone,
  rpm,
}: KilnModelProps) {
  // Helper to get color classes based on RSS score
  const getZoneColor = (rss: number) => {
    if (rss >= 75) return {
      fill: "rgba(239, 68, 68, 0.45)",
      stroke: "#ef4444",
      glow: "rgba(239, 68, 68, 0.6)",
      text: "text-red-400",
      bg: "bg-red-950/40 border-red-500/30"
    };
    if (rss >= 40) return {
      fill: "rgba(245, 158, 11, 0.45)",
      stroke: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.6)",
      text: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-500/30"
    };
    return {
      fill: "rgba(16, 185, 129, 0.3)",
      stroke: "#10b981",
      glow: "rgba(16, 185, 129, 0.4)",
      text: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-500/30"
    };
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const selectedStyle = getZoneColor(selectedZone.rss);

  // SVG parameters
  const kilnWidth = 800;
  const kilnHeight = 160;
  const paddingX = 40;
  const totalLength = 67; // total length of the kiln in meters (from INITIAL_ZONES)

  // Translate meter position to SVG X coordinate
  const getX = (meters: number) => {
    const scale = (kilnWidth - 2 * paddingX) / totalLength;
    return paddingX + meters * scale;
  };

  // Cross-section lining details
  const nominalLining = 250; // mm
  const currentLining = selectedZone.wearThickness;
  const liningPercentage = (currentLining / nominalLining) * 100;
  const innerRadius = 55 + (currentLining / nominalLining) * 20; // scales between 55 and 75

  return (
    <div className="glass-panel p-6 flex flex-col relative overflow-hidden">
      {/* Title / Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-sky-400">
            <Activity className="w-5 h-5 text-sky-400 animate-pulse" />
            Digital Twin: Live Thermal Shell Profile
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dangote Cement Plc - Kiln 3 (Obajana Plant). Click zones for telemetry diagnostics.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-slate-300">ESP32 Rig: Online</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400">Shell Speed:</span>
            <span className="text-xs font-mono font-bold text-sky-400 animate-pulse">
              {rpm.toFixed(2)} RPM
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Kiln Model & Selected Zone Cross-section */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch my-2">
        {/* Left 3 columns: Horizontal Digital Twin Cylinder */}
        <div className="col-span-1 xl:col-span-3 flex flex-col justify-center bg-slate-950/40 border border-slate-900 p-4 rounded-2xl">
          <div className="w-full overflow-x-auto py-2">
            <svg
              viewBox={`0 0 ${kilnWidth} ${kilnHeight + 60}`}
              className="w-full min-w-[700px] select-none"
            >
              <style>{`
                @keyframes spin-clockwise {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .spin-tyre {
                  animation: spin-clockwise linear infinite;
                }
              `}</style>
              
              {/* SVG Definitions for Gradients/Filters */}
              <defs>
                <linearGradient id="kilnShellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="25%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="75%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <pattern id="girthGearPattern" width="10" height="20" patternUnits="userSpaceOnUse">
                  <rect x="1" y="0" width="3" height="20" fill="rgba(148, 163, 184, 0.2)" />
                </pattern>
                <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </radialGradient>
              </defs>

              {/* Kiln Support Rollers / Tyres */}
              {/* Tyre 1 (Inlet) */}
              <g transform={`translate(${getX(10)}, ${kilnHeight / 2 + 10})`}>
                <rect x="-10" y="-70" width="20" height="120" rx="3" fill="#1e293b" opacity="0.85" />
                <circle cx="0" cy="55" r="16" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <line x1="-12" y1="55" x2="12" y2="55" stroke="#334155" strokeWidth="2"
                      className="spin-tyre"
                      style={{ transformOrigin: "0px 55px", animationDuration: `${60 / rpm}s` }} />
                <circle cx="0" cy="55" r="4" fill="#64748b" />
              </g>

              {/* Tyre 2 (Middle Girth Gear & Roller) */}
              <g transform={`translate(${getX(34)}, ${kilnHeight / 2 + 10})`}>
                <rect x="-14" y="-73" width="28" height="126" rx="4" fill="#020617" stroke="#334155" strokeWidth="2" />
                {/* Girth Gear teeth */}
                <rect x="-8" y="-71" width="16" height="122" rx="1" fill="url(#girthGearPattern)" />
                <circle cx="0" cy="58" r="18" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <line x1="0" y1="58" x2="18" y2="58" stroke="#38bdf8" strokeWidth="3"
                      className="spin-tyre"
                      style={{ transformOrigin: "0px 58px", animationDuration: `${60 / rpm}s` }} />
                <circle cx="0" cy="58" r="5" fill="#64748b" />
              </g>

              {/* Tyre 3 (Outlet) */}
              <g transform={`translate(${getX(55)}, ${kilnHeight / 2 + 10})`}>
                <rect x="-10" y="-70" width="20" height="120" rx="3" fill="#1e293b" opacity="0.85" />
                <circle cx="0" cy="55" r="16" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <line x1="-12" y1="55" x2="12" y2="55" stroke="#334155" strokeWidth="2"
                      className="spin-tyre"
                      style={{ transformOrigin: "0px 55px", animationDuration: `${60 / rpm}s` }} />
                <circle cx="0" cy="55" r="4" fill="#64748b" />
              </g>

              {/* Main Kiln Cylinder Base (The Shell) */}
              <rect
                x={paddingX}
                y={20}
                width={kilnWidth - 2 * paddingX}
                height={kilnHeight - 40}
                rx="6"
                fill="url(#kilnShellGrad)"
                stroke="#1e293b"
                strokeWidth="3"
              />

              {/* Thermal Overlay segments */}
              {zones.map((zone) => {
                const xStart = getX(zone.startPos);
                const xEnd = getX(zone.endPos);
                const width = xEnd - xStart;
                const style = getZoneColor(zone.rss);
                const isSelected = selectedZoneId === zone.id;

                return (
                  <g
                    key={zone.id}
                    onClick={() => onSelectZone(zone.id)}
                    className="cursor-pointer group"
                  >
                    {/* Glow Filter Rectangle */}
                    <rect
                      x={xStart + 1}
                      y={21}
                      width={width - 2}
                      height={kilnHeight - 42}
                      rx="4"
                      fill={style.fill}
                      className="transition-all duration-500 thermal-glow-animate"
                      style={{ color: style.stroke }}
                    />

                    {/* Segment Boundary Highlight Ring */}
                    <line
                      x1={xStart}
                      y1={20}
                      x2={xStart}
                      y2={kilnHeight - 20}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />

                    {/* Highlight boundary for selected zone */}
                    {isSelected && (
                      <rect
                        x={xStart}
                        y={18}
                        width={width}
                        height={kilnHeight - 36}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        className="animate-pulse"
                        filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))"
                      />
                    )}

                    {/* Hover ring */}
                    <rect
                      x={xStart}
                      y={20}
                      width={width}
                      height={kilnHeight - 40}
                      fill="transparent"
                      stroke="rgba(56, 189, 248, 0.3)"
                      strokeWidth="2"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </g>
                );
              })}

              {/* Kiln Burner Flame Graphic (Right Outlet End) */}
              <g transform={`translate(${getX(totalLength) + 12}, ${kilnHeight / 2})`} className="animate-pulse">
                <path
                  d="M-5,-10 C10,-25 35,0 10,25 C-5,10 -15,0 -5,-10 Z"
                  fill="rgba(249, 115, 22, 0.85)"
                  className="thermal-glow-animate"
                  style={{ color: "rgb(249, 115, 22)" }}
                />
                <path
                  d="M2,-5 C12,-15 25,0 12,15 C2,5 -5,0 2,-5 Z"
                  fill="rgba(239, 68, 68, 0.95)"
                />
                <rect x="-18" y="-4" width="14" height="8" fill="#475569" />
              </g>

              {/* Axis label markers (Meters along Kiln) */}
              <g transform={`translate(0, ${kilnHeight + 10})`}>
                <line x1={paddingX} y1="0" x2={kilnWidth - paddingX} y2="0" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="2" />
                {[0, 10, 20, 30, 40, 50, 60, 67].map((meter) => (
                  <g key={meter} transform={`translate(${getX(meter)}, 0)`}>
                    <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1.5" />
                    <text
                      x="0"
                      y="18"
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {meter}m
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* Right 1 column: Lining Circular Cross-Section Cutout */}
        <div className="col-span-1 bg-slate-950/60 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-between text-center select-none animate-fade-in">
          <div className="w-full">
            <span className="text-[10px] text-sky-400 font-bold font-mono uppercase tracking-wider block mb-1">
              Cross-Section Cutout
            </span>
            <h3 className="text-xs font-bold text-slate-200">
              {selectedZone.name} Lining
            </h3>
          </div>

          {/* SVG Circular Cross-Section */}
          <div className="relative my-4 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              {/* Outer steel shell */}
              <circle cx="100" cy="100" r="85" fill="none" stroke="#475569" strokeWidth="4" />
              
              {/* Refractory Brick lining ring */}
              <circle cx="100" cy="100" r="82.5" fill="none" stroke={selectedStyle.stroke} strokeWidth="16" opacity="0.15" />
              <circle
                cx="100"
                cy="100"
                r="82.5"
                fill="none"
                stroke={selectedStyle.stroke}
                strokeWidth="12"
                strokeDasharray="6 2"
                className="animate-pulse"
              />

              {/* Inner background cutout (furnace gas space) */}
              <circle cx="100" cy="100" r={innerRadius} fill="url(#fireGlow)" />

              {/* Flame core representation */}
              <g transform="translate(100, 100) scale(0.6)" className="animate-pulse">
                <Flame className="w-12 h-12 text-amber-400 -translate-x-6 -translate-y-6" />
              </g>
              
              {/* Labels overlay */}
              <text x="100" y="38" fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
                STEEL SHELL
              </text>
              <text x="100" y="168" fill={selectedStyle.stroke} fontSize="9" textAnchor="middle" fontWeight="black" fontFamily="monospace">
                REFRACTORY: {currentLining}mm
              </text>
            </svg>

            {/* Glowing warning badge for critical wear */}
            {selectedZone.wearThickness < 120 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-950/80 border border-red-500 text-red-400 p-2.5 rounded-xl shadow-lg flex flex-col items-center gap-0.5 animate-bounce">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider">CRITICAL THIN</span>
              </div>
            )}
          </div>

          {/* Quick Metrics display */}
          <div className="w-full grid grid-cols-2 gap-2 bg-[#070b19]/60 p-2.5 rounded-xl border border-slate-900 text-left font-mono">
            <div>
              <span className="text-[9px] text-slate-500 block">Lining State</span>
              <span className={`text-[10px] font-bold ${
                selectedZone.wearThickness < 120 ? "text-red-400" : "text-emerald-400"
              }`}>
                {liningPercentage.toFixed(0)}% Integrity
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Core Temp</span>
              <span className="text-[10px] text-slate-200 font-bold">
                {selectedZone.id === 3 ? "~1450°C" : selectedZone.id === 1 ? "~850°C" : "~1200°C"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Legend & Zone Index cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 w-full mt-6">
        {zones.map((zone) => {
          const style = getZoneColor(zone.rss);
          const isSelected = selectedZoneId === zone.id;
          
          return (
            <button
              key={zone.id}
              onClick={() => onSelectZone(zone.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-slate-900 border-sky-500 shadow-lg shadow-sky-500/10"
                  : "bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/30"
              }`}
            >
              <div className="flex justify-between items-center gap-1">
                <span className="text-xs font-bold text-slate-300 truncate">{zone.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                  zone.rss >= 75 ? "bg-red-500/20 text-red-400" :
                  zone.rss >= 40 ? "bg-amber-500/20 text-amber-400" :
                  "bg-emerald-500/20 text-emerald-400"
                }`}>
                  RSS {zone.rss}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <span className="text-[10px] text-slate-500">Shell Temp</span>
                <span className="text-xs font-mono font-bold text-slate-300">{zone.temp}°C</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-500">Brick Lining</span>
                <span className={`text-xs font-mono font-bold ${
                  zone.wearThickness < 120 ? "text-red-400" : "text-slate-300"
                }`}>{zone.wearThickness}mm</span>
              </div>
              {/* Progress stress bar */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-900/60">
                <div
                  className={`h-full rounded-full ${
                    zone.rss >= 75 ? "bg-red-500" :
                    zone.rss >= 40 ? "bg-amber-500" :
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${zone.rss}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
