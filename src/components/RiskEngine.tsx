"use client";

import React, { useState, useEffect } from "react";
import { 
  KilnZone, 
  calculateRSS, 
  calculateWearThickness, 
  calculateChemFactor,
  FUEL_REFERENCE_TABLE,
  FuelSpecs
} from "@/utils/mockData";
import { Gauge, HelpCircle, Settings2, Info, ChevronRight, FlaskConical, AlertTriangle, ArrowRight } from "lucide-react";

interface RiskEngineProps {
  selectedZone: KilnZone;
  onUpdateZone: (updatedZone: KilnZone) => void;
}

export default function RiskEngine({
  selectedZone,
  onUpdateZone,
}: RiskEngineProps) {
  const [editingWeights, setEditingWeights] = useState(false);
  const [localWeights, setLocalWeights] = useState(selectedZone.weights);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Sync local weights when selected zone changes
  useEffect(() => {
    setLocalWeights(selectedZone.weights);
  }, [selectedZone.id, selectedZone.weights]);

  // Handle changes to chemical input parameters
  const handleChemChange = (field: "chlorine" | "sulfur" | "alkali", val: number) => {
    const updated = { 
      ...selectedZone, 
      [field]: val,
      selectedFuel: "Custom Fuel Blend"
    };

    // Calculate new Chemical Factor sub-model score
    const newChemFactor = calculateChemFactor(
      field === "chlorine" ? val : selectedZone.chlorine,
      field === "sulfur" ? val : selectedZone.sulfur,
      field === "alkali" ? val : selectedZone.alkali
    );
    updated.chemFactor = newChemFactor;

    // Recalculate RSS and wear thickness using zone weights
    const rss = calculateRSS(selectedZone.tSpike, selectedZone.tCycle, newChemFactor, selectedZone.weights);
    updated.rss = rss;

    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
    updated.wearThickness = calculateWearThickness(rss, baseThick);

    onUpdateZone(updated);
  };

  // Handle preset fuel selection
  const handleFuelSelect = (fuelName: string) => {
    const fuel = FUEL_REFERENCE_TABLE.find(f => f.name === fuelName);
    if (!fuel) return;

    const newChemFactor = calculateChemFactor(fuel.chlorine, fuel.sulfur, fuel.alkali);
    const rss = calculateRSS(selectedZone.tSpike, selectedZone.tCycle, newChemFactor, selectedZone.weights);
    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;

    onUpdateZone({
      ...selectedZone,
      selectedFuel: fuel.name,
      chlorine: fuel.chlorine,
      sulfur: fuel.sulfur,
      alkali: fuel.alkali,
      chemFactor: newChemFactor,
      rss,
      wearThickness: calculateWearThickness(rss, baseThick)
    });
  };

  // Handle slider changes for TSpike / TCycle
  const handleSliderChange = (field: "tSpike" | "tCycle", val: number) => {
    const updated = { ...selectedZone, [field]: val };
    const rss = calculateRSS(
      field === "tSpike" ? val : selectedZone.tSpike,
      field === "tCycle" ? val : selectedZone.tCycle,
      selectedZone.chemFactor,
      selectedZone.weights
    );
    updated.rss = rss;

    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
    updated.wearThickness = calculateWearThickness(rss, baseThick);

    onUpdateZone(updated);
  };

  // Handle active zone weights calibration changes
  const handleWeightChange = (field: keyof typeof localWeights, val: number) => {
    setLocalWeights({ ...localWeights, [field]: val });
  };

  // Save active zone weights
  const saveWeights = () => {
    const rss = calculateRSS(selectedZone.tSpike, selectedZone.tCycle, selectedZone.chemFactor, localWeights);
    const baseThick = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;

    onUpdateZone({
      ...selectedZone,
      weights: localWeights,
      rss,
      wearThickness: calculateWearThickness(rss, baseThick)
    });
    setEditingWeights(false);
  };

  // Determine dynamic alert message based on fuel chemistry
  const getChemExplanation = () => {
    if (selectedZone.chlorine > 0.5) {
      return "CRITICAL Cl: High Chlorine (>0.5 wt%) accelerates volatile alkali-chloride cycles, provoking severe structural spalling on magnesia-spinel brick.";
    }
    if (selectedZone.sulfur > 1.5) {
      return "WARNING S: High Sulfur levels react to form expansive alkali-sulfate minerals, driving subsurface fractures & mechanical lining bursting.";
    }
    if (selectedZone.alkali > 1.5) {
      return "WARNING Alk: Elevating Alkali content prompts liquid-phase formation in bricks, accelerating corrosion & structural melting.";
    }
    return "SAFE CHEMS: Mineral volatile infiltration is within nominal limits. Minor alkali salt deposition is within structural tolerances.";
  };

  const explanationColor = selectedZone.chlorine > 0.5 
    ? "text-red-400 bg-red-950/20 border-red-500/20" 
    : (selectedZone.sulfur > 1.5 || selectedZone.alkali > 1.5) 
    ? "text-amber-400 bg-amber-950/20 border-amber-500/20" 
    : "text-emerald-400 bg-emerald-950/20 border-emerald-500/20";

  const rssColorHex = selectedZone.rss >= 75 ? "#ef4444" : selectedZone.rss >= 40 ? "#f59e0b" : "#10b981";
  const circ = 2 * Math.PI * 40;
  const rssOffset = circ - (selectedZone.rss / 100) * circ;
  const maxThickness = selectedZone.id === 3 ? 210 : selectedZone.id === 2 || selectedZone.id === 4 ? 230 : 250;
  const thicknessOffset = circ - (selectedZone.wearThickness / maxThickness) * circ;

  return (
    <div className="glass-panel p-6 flex flex-col h-full select-none gap-6">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <span className="text-[10px] font-mono text-sky-400 font-bold tracking-wider uppercase block">
              Predictive Diagnostics
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">
              {selectedZone.name}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono">Boundaries</span>
          <span className="text-xs font-mono font-bold text-slate-300">
            {selectedZone.startPos}m – {selectedZone.endPos}m
          </span>
        </div>
      </div>

      {/* Circular Gauges */}
      <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-900 justify-items-center">
        {/* RSS */}
        <div className="flex flex-col items-center gap-2 border-r border-slate-900/80 w-full">
          <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(15, 23, 42, 0.6)" strokeWidth="6" />
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
          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
            selectedZone.rss >= 75 ? "bg-red-500/10 text-red-400" :
            selectedZone.rss >= 40 ? "bg-amber-500/10 text-amber-400" :
            "bg-emerald-500/10 text-emerald-400"
          }`}>
            {selectedZone.rss >= 75 ? "Emergency" : selectedZone.rss >= 40 ? "Warning" : "Safe"}
          </span>
        </div>

        {/* Lining Thickness */}
        <div className="flex flex-col items-center gap-2 w-full">
          <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(15, 23, 42, 0.6)" strokeWidth="6" />
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
          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
            selectedZone.wearThickness < 120 ? "bg-red-500/10 text-red-400 animate-pulse border border-red-500/20" : "bg-slate-800 text-slate-400"
          }`}>
            {selectedZone.wearThickness < 120 ? "Replace Brick" : "Operational"}
          </span>
        </div>
      </div>

      {/* Parameters Modifiers */}
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
        {/* T-Spike Slider */}
        <div className="bg-slate-950/20 border border-slate-900 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <label className="text-xs font-bold text-slate-300 font-mono">
                T-Spike Severity (wSpike: {Math.round(selectedZone.weights.wSpike * 100)}%)
              </label>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {selectedZone.tSpike}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={selectedZone.tSpike}
            onChange={(e) => handleSliderChange("tSpike", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* T-Cycle Slider */}
        <div className="bg-slate-950/20 border border-slate-900 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <label className="text-xs font-bold text-slate-300 font-mono">
                T-Cycle Spalling (wCycle: {Math.round(selectedZone.weights.wCycle * 100)}%)
              </label>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {selectedZone.tCycle}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={selectedZone.tCycle}
            onChange={(e) => handleSliderChange("tCycle", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* CHEMISTRY SUB-MODEL PANEL */}
        <div className="bg-[#090e1c]/40 border border-slate-900 p-4 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-sky-400 font-mono">
              <FlaskConical className="w-4 h-4 text-sky-400" />
              Fuel Chemistry Sub-Model
            </span>
            {/* Computed Chemical Factor Badge */}
            <span className="text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">
              Factor: {selectedZone.chemFactor}% (wChem: {Math.round(selectedZone.weights.wChem * 100)}%)
            </span>
          </div>

          {/* Fuel Reference Dropdown */}
          <div className="flex flex-col gap-1 text-[10px]">
            <label className="text-slate-400 font-bold font-mono">Load Fuel Reference specs</label>
            <select
              value={selectedZone.selectedFuel}
              onChange={(e) => handleFuelSelect(e.target.value)}
              className="bg-slate-950 text-slate-300 border border-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 text-xs"
            >
              {FUEL_REFERENCE_TABLE.map((fuel) => (
                <option key={fuel.name} value={fuel.name}>
                  {fuel.name} {fuel.isEstimated ? "[*Est Data]" : ""}
                </option>
              ))}
              <option value="Custom Fuel Blend">Custom Fuel Blend</option>
            </select>
          </div>

          {/* Three Chemistry Sliders */}
          {/* Chlorine Cl Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="text-slate-300 font-bold font-mono">Chlorine Content (Cl, wt%)</span>
              <span className={`font-mono font-bold px-1.5 rounded ${
                selectedZone.chlorine > 0.5 ? "bg-red-950/60 text-red-400 border border-red-900/60" : "bg-slate-950 text-slate-400"
              }`}>{selectedZone.chlorine.toFixed(2)} wt%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.50"
              step="0.01"
              value={selectedZone.chlorine}
              onChange={(e) => handleChemChange("chlorine", parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Sulfur S Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="text-slate-300 font-bold font-mono">Sulfur Content (S, wt%)</span>
              <span className="bg-slate-950 text-slate-400 font-mono font-bold px-1.5 rounded">
                {selectedZone.sulfur.toFixed(2)} wt%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="5.00"
              step="0.05"
              value={selectedZone.sulfur}
              onChange={(e) => handleChemChange("sulfur", parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Alkalis Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="text-slate-300 font-bold font-mono">Alkalis (Na₂O + K₂O, wt%)</span>
              <span className="bg-slate-950 text-slate-400 font-mono font-bold px-1.5 rounded">
                {selectedZone.alkali.toFixed(2)} wt%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="3.00"
              step="0.05"
              value={selectedZone.alkali}
              onChange={(e) => handleChemChange("alkali", parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Chemistry alert message */}
          <p className={`p-2.5 rounded-lg border text-[9px] leading-relaxed font-mono ${explanationColor}`}>
            {getChemExplanation()}
          </p>

          {/* Fuel Baseline data disclaimer */}
          {FUEL_REFERENCE_TABLE.find(f => f.name === selectedZone.selectedFuel)?.isEstimated && (
            <p className="text-[8px] text-slate-500 font-semibold italic -mt-2">
              * Note: Alternative fuel chemistry represents industrial average values. Pending citation check for plant laboratory logs.
            </p>
          )}

          {/* VAPOR MIGRATION ATTACK MECHANISM DIAGRAM */}
          <div className="border-t border-slate-900/60 pt-3 flex flex-col gap-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono block">
              Vapor Infiltration Mechanism
            </span>
            <svg viewBox="0 0 400 130" className="w-full bg-[#03060f] border border-slate-900 rounded-xl p-2 select-none">
              {/* Flame (hot end) */}
              <path d="M10,90 Q20,30 35,55 Q50,30 55,90 Z" fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" strokeWidth="1" className="animate-pulse" />
              <text x="25" y="100" fill="#f97316" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                Hot Zone (1450°C)
              </text>
              
              {/* Volatiles Volatilize */}
              <text x="75" y="45" fill="#fef08a" fontSize="6.5" textAnchor="middle" fontFamily="monospace">
                Volatiles Gasify (Cl, S, K, Na)
              </text>
              <path d="M25,60 Q70,40 110,65" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M105,62 L111,65 L106,69" fill="none" stroke="#fef08a" strokeWidth="1.5" />
              
              {/* Kiln tube outline */}
              <line x1="25" y1="95" x2="380" y2="95" stroke="#334155" strokeWidth="2" />
              <line x1="25" y1="20" x2="380" y2="20" stroke="#334155" strokeWidth="2" />

              {/* Condensation (cooler end) */}
              <rect x="220" y="25" width="150" height="65" fill="none" stroke="#1e293b" strokeDasharray="2 2" />
              <text x="295" y="15" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                Cooler Zone (Inlet, ~900°C)
              </text>
              
              {/* Brick spalling representation */}
              {/* Pores zoomed in */}
              <g transform="translate(240, 30)">
                <rect x="5" y="5" width="45" height="45" fill="#1e293b" opacity="0.6" rx="2" />
                <text x="27.5" y="20" fill="#38bdf8" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  1. CONDENSES
                </text>
                <text x="27.5" y="32" fill="#64748b" fontSize="5" textAnchor="middle" fontFamily="sans-serif">
                  within brick pores
                </text>
                <circle cx="15" cy="40" r="1.5" fill="#f59e0b" />
                <circle cx="28" cy="42" r="1.5" fill="#f59e0b" />
                <circle cx="40" cy="38" r="1.5" fill="#f59e0b" />
              </g>

              <g transform="translate(305, 30)">
                <rect x="5" y="5" width="55" height="45" fill="#1e293b" opacity="0.6" rx="2" stroke="#ef4444" strokeWidth="0.5" />
                <text x="32.5" y="20" fill="#f87171" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  2. SPALLING
                </text>
                <text x="32.5" y="32" fill="#64748b" fontSize="5" textAnchor="middle" fontFamily="sans-serif">
                  Volumetric growth
                </text>
                <text x="32.5" y="42" fill="#64748b" fontSize="5" textAnchor="middle" fontFamily="sans-serif">
                  causes brick cracks
                </text>
                {/* Crack lines */}
                <path d="M7,15 Q25,25 15,45" fill="none" stroke="#ef4444" strokeWidth="1" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Active Zone Weights Calibration */}
      <div className="mt-2 pt-4 border-t border-slate-900">
        {!editingWeights ? (
          <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 gap-3">
            <div className="text-left font-mono">
              <span className="text-[9px] text-slate-500 uppercase font-bold block">Active Coefficient Matrix</span>
              <span className="text-[10px] text-slate-300">
                RSS = {selectedZone.weights.wSpike.toFixed(2)}·S + {selectedZone.weights.wCycle.toFixed(2)}·C + {selectedZone.weights.wChem.toFixed(2)}·Ch
              </span>
            </div>
            <button
              onClick={() => {
                setLocalWeights(selectedZone.weights);
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
