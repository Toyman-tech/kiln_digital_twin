"use client";

import React, { useState } from "react";
import { KilnZone, calculateRSS, calculateWearThickness } from "@/utils/mockData";
import { Gauge, HelpCircle, Settings2, Info, AlertOctagon, CheckCircle2 } from "lucide-react";

interface RiskEngineProps {
  selectedZone: KilnZone;
  onUpdateZone: (updatedZone: KilnZone) => void;
  weights: { wSpike: number; wCycle: number; wChem: number };
  onUpdateWeights: (weights: { wSpike: number; wCycle: number; wChem: number }) => void;
}

export default function RiskEngine({
  selectedZone,
  onUpdateZone,
  weights,
  onUpdateWeights,
}: RiskEngineProps) {
  const [editingWeights, setEditingWeights] = useState(false);
  const [localWeights, setLocalWeights] = useState(weights);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleSliderChange = (field: keyof KilnZone, val: number) => {
    const updated = { ...selectedZone, [field]: val };
    
    // Recalculate RSS using current weights
    const rss = Math.round(
      (weights.wSpike * (field === "tSpike" ? val : selectedZone.tSpike)) +
      (weights.wCycle * (field === "tCycle" ? val : selectedZone.tCycle)) +
      (weights.wChem * (field === "chemFactor" ? val : selectedZone.chemFactor))
    );
    
    updated.rss = Math.min(100, Math.max(0, rss));
    
    // Estimate wear thickness based on RSS
    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
    updated.wearThickness = calculateWearThickness(updated.rss, baseThick);

    onUpdateZone(updated);
  };

  const handleWeightChange = (field: keyof typeof localWeights, val: number) => {
    setLocalWeights({ ...localWeights, [field]: val });
  };

  const saveWeights = () => {
    onUpdateWeights(localWeights);
    
    // Update selected zone RSS based on new weights
    const rss = Math.round(
      (localWeights.wSpike * selectedZone.tSpike) +
      (localWeights.wCycle * selectedZone.tCycle) +
      (localWeights.wChem * selectedZone.chemFactor)
    );
    
    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
    const newRSS = Math.min(100, Math.max(0, rss));
    
    onUpdateZone({
      ...selectedZone,
      rss: newRSS,
      wearThickness: calculateWearThickness(newRSS, baseThick)
    });
    setEditingWeights(false);
  };

  // Determine stress state visual parameters
  const rssColor = selectedZone.rss >= 75 ? "text-red-400" : selectedZone.rss >= 40 ? "text-amber-400" : "text-emerald-400";
  const rssColorHex = selectedZone.rss >= 75 ? "#ef4444" : selectedZone.rss >= 40 ? "#f59e0b" : "#10b981";
  
  const circ = 2 * Math.PI * 40; // 251.32 circumference for r=40
  const rssOffset = circ - (selectedZone.rss / 100) * circ;
  
  const maxThickness = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
  const thicknessOffset = circ - (selectedZone.wearThickness / maxThickness) * circ;

  return (
    <div className="glass-panel p-6 flex flex-col h-full select-none justify-between">
      {/* Zone Header Info */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-400 animate-pulse" />
            <div>
              <span className="text-[10px] font-mono text-sky-400 font-bold tracking-wider uppercase block">
                Telemetry Mathematical Engine
              </span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                {selectedZone.name} Core
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono">Location Boundary</span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {selectedZone.startPos}m – {selectedZone.endPos}m
            </span>
          </div>
        </div>

        {/* Circular Gauges Workspace */}
        <div className="my-6 grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-900 justify-items-center">
          {/* Gauge 1: RSS Score */}
          <div className="flex flex-col items-center gap-2 border-r border-slate-900/80 w-full">
            <div className="relative">
              <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-md">
                {/* Track */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(15, 23, 42, 0.6)" strokeWidth="6" />
                {/* Progress */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={rssColorHex}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={rssOffset}
                  transform="rotate(-90 50 50)"
                  className="transition-all duration-500 ease-out"
                />
                <text x="50" y="52" textAnchor="middle" fill="#ffffff" className="font-mono text-2xl font-black tracking-tighter">
                  {selectedZone.rss}
                </text>
                <text x="50" y="68" textAnchor="middle" fill="#64748b" className="font-bold text-[8px] uppercase tracking-wider font-mono">
                  Stress RSS
                </text>
              </svg>
            </div>
            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
              selectedZone.rss >= 75 ? "bg-red-500/10 text-red-400" :
              selectedZone.rss >= 40 ? "bg-amber-500/10 text-amber-400" :
              "bg-emerald-500/10 text-emerald-400"
            }`}>
              {selectedZone.rss >= 75 ? "Critical Stress" : selectedZone.rss >= 40 ? "Thermal Strain" : "Normal state"}
            </span>
          </div>

          {/* Gauge 2: Lining Thickness */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="relative">
              <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-md">
                {/* Track */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(15, 23, 42, 0.6)" strokeWidth="6" />
                {/* Progress */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={selectedZone.wearThickness < 120 ? "#f87171" : "#38bdf8"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={thicknessOffset}
                  transform="rotate(-90 50 50)"
                  className="transition-all duration-500 ease-out"
                />
                <text x="50" y="52" textAnchor="middle" fill="#ffffff" className="font-mono text-2xl font-black tracking-tighter">
                  {selectedZone.wearThickness}
                </text>
                <text x="50" y="68" textAnchor="middle" fill="#64748b" className="font-bold text-[8px] uppercase tracking-wider font-mono">
                  Thickness mm
                </text>
              </svg>
            </div>
            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
              selectedZone.wearThickness < 120 ? "bg-red-500/10 text-red-400 animate-pulse border border-red-500/20" : "bg-slate-800 text-slate-400"
            }`}>
              {selectedZone.wearThickness < 120 ? "Thin lining" : "Nominal lining"}
            </span>
          </div>
        </div>

        {/* Manual Telemetry Modifiers */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Slider 1: Spike */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <label className="text-xs font-semibold text-slate-300">
                  T-Spike Index (W: {Math.round(weights.wSpike * 100)}%)
                </label>
                <button onClick={() => setActiveTooltip(activeTooltip === "spike" ? null : "spike")} className="text-slate-500 hover:text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
                {selectedZone.tSpike}%
              </span>
            </div>
            {activeTooltip === "spike" && (
              <p className="text-[10px] bg-slate-950 border border-slate-900 text-slate-400 p-2.5 rounded-lg mb-2 leading-relaxed">
                Calculates thermal stress severity based on duration of shell temperature exceeding nominal limits (e.g. Shell temp &gt; 1300°C for Burning zone). High values signal structural hot spots.
              </p>
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={selectedZone.tSpike}
              onChange={(e) => handleSliderChange("tSpike", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Slider 2: Cycle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <label className="text-xs font-semibold text-slate-300">
                  T-Cycle Spalling (W: {Math.round(weights.wCycle * 100)}%)
                </label>
                <button onClick={() => setActiveTooltip(activeTooltip === "cycle" ? null : "cycle")} className="text-slate-500 hover:text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
                {selectedZone.tCycle}%
              </span>
            </div>
            {activeTooltip === "cycle" && (
              <p className="text-[10px] bg-slate-950 border border-slate-900 text-slate-400 p-2.5 rounded-lg mb-2 leading-relaxed">
                Measures risk of refractory brick thermal shock and spalling from rapid heating/cooling cycles (temperature rates of change exceeding 50°C per hour).
              </p>
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={selectedZone.tCycle}
              onChange={(e) => handleSliderChange("tCycle", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Slider 3: Chem */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <label className="text-xs font-semibold text-slate-300">
                  Chemical Factor (W: {Math.round(weights.wChem * 100)}%)
                </label>
                <button onClick={() => setActiveTooltip(activeTooltip === "chem" ? null : "chem")} className="text-slate-500 hover:text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
                {selectedZone.chemFactor}%
              </span>
            </div>
            {activeTooltip === "chem" && (
              <p className="text-[10px] bg-slate-950 border border-slate-900 text-slate-400 p-2.5 rounded-lg mb-2 leading-relaxed">
                Stresses from clinker chemical mix composition, specifically trace sulfur/chlorine infiltration into porous brick linings typical when co-processing alternative fuels.
              </p>
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={selectedZone.chemFactor}
              onChange={(e) => handleSliderChange("chemFactor", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>
      </div>

      {/* Math Engine Mathematical Calibrator */}
      <div className="mt-6 pt-4 border-t border-slate-900">
        {!editingWeights ? (
          <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 gap-3">
            <div className="text-left font-mono">
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Active Coefficient Matrix</span>
              <span className="text-[10px] text-slate-300">
                RSS = {weights.wSpike.toFixed(2)}·S + {weights.wCycle.toFixed(2)}·C + {weights.wChem.toFixed(2)}·Ch
              </span>
            </div>
            <button
              onClick={() => {
                setLocalWeights(weights);
                setEditingWeights(true);
              }}
              className="text-[10px] bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/20 px-2.5 py-1.5 rounded-lg font-bold transition-all uppercase flex items-center gap-1 cursor-pointer"
            >
              <Settings2 className="w-3 h-3" /> Calibrate
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/95 p-4 rounded-xl border border-slate-800 animate-fade-in">
            <span className="text-xs font-bold text-slate-200 block mb-3 font-mono">
              Calibrate Math Coefficients
            </span>
            <div className="flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">wSpike (Temperature Spike):</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1.0"
                  value={localWeights.wSpike}
                  onChange={(e) => handleWeightChange("wSpike", parseFloat(e.target.value) || 0)}
                  className="bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-slate-800 w-16 text-center"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">wCycle (Thermal Cycling):</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1.0"
                  value={localWeights.wCycle}
                  onChange={(e) => handleWeightChange("wCycle", parseFloat(e.target.value) || 0)}
                  className="bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-slate-800 w-16 text-center"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">wChem (Chemical Index):</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1.0"
                  value={localWeights.wChem}
                  onChange={(e) => handleWeightChange("wChem", parseFloat(e.target.value) || 0)}
                  className="bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-slate-800 w-16 text-center"
                />
              </div>
              
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => setEditingWeights(false)}
                  className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWeights}
                  className="text-[10px] bg-sky-500 hover:bg-sky-600 text-slate-950 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
