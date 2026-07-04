"use client";

import React, { useState, useEffect } from "react";
import { INITIAL_ZONES, KilnZone, calculateRSS, calculateWearThickness } from "@/utils/mockData";
import KilnModel from "@/components/KilnModel";
import RiskEngine from "@/components/RiskEngine";
import TelemetrySim from "@/components/TelemetrySim";
import AlertCenter from "@/components/AlertCenter";
import WearCharts from "@/components/WearCharts";
import { 
  Layers, 
  ShieldAlert, 
  Cpu, 
  CheckCircle, 
  Database, 
  LayoutDashboard, 
  BellRing, 
  Settings, 
  Activity, 
  Flame, 
  Wrench,
  Wifi,
  BarChart3,
  Gauge
} from "lucide-react";

export default function KilnGuardDashboard() {
  const [zones, setZones] = useState<KilnZone[]>(INITIAL_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(3); // Default to Burning Zone (hottest/most active)
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "hardware">("overview");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [rpm, setRpm] = useState<number>(3.5);
  const [weights, setWeights] = useState({
    wSpike: 0.35,
    wCycle: 0.45,
    wChem: 0.20,
  });

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Helper to update a single zone's data
  const handleUpdateZone = (updatedZone: KilnZone) => {
    setZones((prev) => prev.map((z) => (z.id === updatedZone.id ? updatedZone : z)));
  };

  // Trigger a hardware sensor open circuit fault
  const handleTriggerFault = (zoneId: number, faultStatus: 'OK' | 'FAULT' | 'OPEN_CIRCUIT') => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        
        let updatedTemp = z.temp;
        let updatedRSS = z.rss;
        
        if (faultStatus === 'OPEN_CIRCUIT') {
          updatedTemp = -1; // Fault value indicating open thermocouple wire
          updatedRSS = 100; // Force critical score for fail-safe trigger
        } else {
          // Recover nominal temperature based on zone
          updatedTemp = zoneId === 3 ? 1390 : zoneId === 1 ? 840 : 1150;
          updatedRSS = calculateRSS(z.tSpike, z.tCycle, z.chemFactor);
        }

        const baseThick = zoneId === 3 ? 210 : zoneId === 2 || zoneId === 4 ? 230 : 250;

        return {
          ...z,
          sensorStatus: faultStatus,
          temp: updatedTemp,
          rss: updatedRSS,
          wearThickness: calculateWearThickness(updatedRSS, baseThick)
        };
      })
    );
  };

  // Refresh data completely
  const handleRefreshData = () => {
    setZones(INITIAL_ZONES.map(z => ({
      ...z,
      rss: calculateRSS(z.tSpike, z.tCycle, z.chemFactor)
    })));
  };

  // Run the Live Simulation Engine loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Fluctuate RPM slightly (normal operational speed is 2.8 - 4.5 RPM)
      setRpm((prev) => {
        const drift = (Math.random() - 0.5) * 0.2;
        return Math.min(4.5, Math.max(2.8, prev + drift));
      });

      // Update zone values dynamically
      setZones((prevZones) =>
        prevZones.map((zone) => {
          if (zone.sensorStatus !== 'OK') return zone; // Skip if fault injected

          // 1. Temperature fluctuations
          let tempDrift = (Math.random() - 0.5) * 12;
          
          // Randomly trigger a thermal spike in some zones
          const isSpiking = Math.random() > 0.95;
          if (isSpiking) {
            tempDrift = (Math.random() * 40) + 20; // sudden heating
          }

          let newTemp = Math.round(zone.temp + tempDrift);
          
          // Constrain temperatures to standard ranges
          if (zone.id === 1) newTemp = Math.min(1050, Math.max(780, newTemp));
          else if (zone.id === 2) newTemp = Math.min(1280, Math.max(1050, newTemp));
          else if (zone.id === 3) newTemp = Math.min(1480, Math.max(1300, newTemp)); // burning zone limit
          else if (zone.id === 4) newTemp = Math.min(1250, Math.max(1080, newTemp));
          else newTemp = Math.min(955, Math.max(720, newTemp));

          // 2. Adjust T_Spike factor based on temperature limit
          const baseTempLimit = zone.id === 3 ? 1380 : zone.id === 1 ? 830 : 1130;
          let newSpike = zone.tSpike;
          if (newTemp > baseTempLimit) {
            newSpike = Math.min(100, zone.tSpike + Math.round(Math.random() * 3));
          } else {
            newSpike = Math.max(0, zone.tSpike - Math.round(Math.random() * 1.5));
          }

          // 3. Randomly trigger thermal cycle spalling risk (rapid drop in temperature)
          const isCoolingFast = Math.random() > 0.97;
          let newCycleFactor = zone.tCycle;
          let newCycleCount = zone.cycleCount;
          if (isCoolingFast) {
            newCycleFactor = Math.min(100, zone.tCycle + Math.round(Math.random() * 8));
            newCycleCount += 1;
          } else {
            newCycleFactor = Math.max(0, zone.tCycle - Math.round(Math.random() * 0.8));
          }

          // 4. Infiltration Chemical Factor fluctuations (alternative fuel chemical composition variations)
          const chemShift = (Math.random() - 0.5) * 2.5;
          const newChemFactor = Math.min(100, Math.max(0, Math.round(zone.chemFactor + chemShift)));

          // 5. Calculate new RSS using active weight calibration
          const newRSS = Math.round(
            (weights.wSpike * newSpike) +
            (weights.wCycle * newCycleFactor) +
            (weights.wChem * newChemFactor)
          );

          // 6. Estimate remaining brick refractory thickness
          const baseThick = zone.id === 3 ? 210 : zone.id === 2 || zone.id === 4 ? 230 : 250;
          const remainingThickness = calculateWearThickness(newRSS, baseThick);

          return {
            ...zone,
            temp: newTemp,
            tSpike: newSpike,
            tCycle: newCycleFactor,
            cycleCount: newCycleCount,
            chemFactor: newChemFactor,
            rss: newRSS,
            wearThickness: remainingThickness,
            // Random fluctuations in WiFi signal
            wifiSignal: Math.min(-50, Math.max(-85, zone.wifiSignal + Math.round((Math.random() - 0.5) * 2)))
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, weights]);

  // Sync initial RSS scores on mount
  useEffect(() => {
    handleRefreshData();
  }, []);

  // Determine overall status indicators
  const highestRSS = Math.max(...zones.map((z) => z.rss));
  const hasCritical = zones.some((z) => z.rss >= 75 || z.sensorStatus === 'OPEN_CIRCUIT');
  const hasWarning = zones.some((z) => z.rss >= 40 && z.rss < 75);
  const alertCount = zones.filter((z) => z.rss >= 40 || z.sensorStatus === 'OPEN_CIRCUIT').length;

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-[#02040a] text-slate-100 selection:bg-sky-500/30 font-sans">
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-64 bg-[#070b19] border-b lg:border-b-0 lg:border-r border-slate-900 flex flex-col justify-between p-5 select-none shrink-0">
        <div className="flex flex-col gap-6">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-900">
            <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/20">
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-1.5">
                KilnGuard
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-sky-400 font-mono px-1 rounded uppercase font-bold tracking-wider">v1.2</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Digital Twin Early-Warning</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-md shadow-sky-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview Dashboard</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            </button>

            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "alerts"
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-md shadow-sky-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BellRing className="w-4 h-4" />
                <span>SAP PM Alert Center</span>
              </div>
              {alertCount > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  hasCritical ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-slate-950"
                }`}>
                  {alertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("hardware")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "hardware"
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-md shadow-sky-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4" />
                <span>ESP32 Hardware Rig</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="mt-6 pt-4 border-t border-slate-900 flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-sky-400 border border-slate-700">
              OP
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold leading-none">Console Operator</div>
              <div className="text-[9px] text-slate-500 mt-1 font-mono">DCP-OBA-K3-094</div>
            </div>
          </div>
          <div className="text-[9px] text-slate-600 font-mono text-center">
            Dangote Cement Plc © 2026
          </div>
        </div>
      </aside>

      {/* Main Workspace content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Header Controls / Info */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6 border-b border-slate-900/80 bg-[#040712]/50 backdrop-blur-md sticky top-0 z-30 select-none">
          <div className="flex flex-col">
            <span className="text-[10px] text-sky-400 font-bold tracking-wider uppercase font-mono">Real-Time Digital Twin Console</span>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight mt-0.5">
              {activeTab === "overview" && "Kiln Refractory & Thermal Overview"}
              {activeTab === "alerts" && "SAP PM Work Order Dispatcher"}
              {activeTab === "hardware" && "ESP32 Sensor Telemetry Rig"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Quick telemetry pills */}
            <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-950/60 border border-slate-900 px-3.5 py-1.5 rounded-xl font-mono">
              <span className="text-slate-500 uppercase text-[9px] font-bold">Quick Diagnostics:</span>
              <div className="flex items-center gap-1 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Max Temp: <strong className="text-slate-100">{Math.max(...zones.map(z => z.temp))}°C</strong></span>
              </div>
              <span className="text-slate-800">|</span>
              <div className="flex items-center gap-1 text-slate-300">
                <Wrench className="w-3.5 h-3.5 text-sky-400" />
                <span>Avg Wear: <strong className="text-slate-100">{Math.round(zones.reduce((acc, z) => acc + z.wearThickness, 0) / zones.length)}mm</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Plant selection dropdown */}
              <div className="flex flex-col text-right">
                <select className="bg-slate-950 text-slate-300 border border-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500">
                  <option>Obajana Plant - Kiln 3</option>
                  <option disabled>Ibese Plant - Kiln 1</option>
                  <option disabled>Gboko Plant - Kiln 2</option>
                </select>
              </div>

              {/* Status bar */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                hasCritical
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : hasWarning
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    hasCritical ? "bg-red-400" : hasWarning ? "bg-amber-400" : "bg-emerald-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    hasCritical ? "bg-red-500" : hasWarning ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  {hasCritical ? "Critical Alert" : hasWarning ? "Warning Stress" : "Nominal"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab contents panel */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
              {/* 1. Digital Twin visualizer */}
              <section id="kiln-twin-model">
                <KilnModel
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                  rpm={rpm}
                />
              </section>

              {/* 2. Side-by-side Risk Engine and Analytics */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Risk engine details (left) */}
                <div className="col-span-1 xl:col-span-2">
                  <RiskEngine
                    selectedZone={selectedZone}
                    onUpdateZone={handleUpdateZone}
                    weights={weights}
                    onUpdateWeights={setWeights}
                  />
                </div>
                {/* Wear curves charts (right) */}
                <div className="col-span-1 xl:col-span-3">
                  <WearCharts selectedZone={selectedZone} />
                </div>
              </div>

              {/* Business Case, Safety & Technical Parameters Footer */}
              <footer className="glass-panel p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#070b19]/20 text-slate-400">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    Mathematical Risk Assumptions
                  </h4>
                  <ul className="text-[11px] space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>Refractory Stress Score (RSS) maps spalling risk with explicit weights.</li>
                    <li>Correlation between surface shell temperature anomalies and internal wear is roughly linear.</li>
                    <li>Calculations assume constant kiln rotational speed. Future SCADA links will integrate RPM.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    Edge Hardware Protection
                  </h4>
                  <ul className="text-[11px] space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>ESP32 edge nodes are housed in NEMA 4X industrial IP66 thermal enclosures.</li>
                    <li>Thermocouple K-type extensions run up to 10m to avoid direct kiln radiation.</li>
                    <li>Local SD card caching protects data logs during Wi-Fi drops (Offline recovery mode).</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Dangote Cement Plc Value
                  </h4>
                  <ul className="text-[11px] space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>Supports DCP Alternative Fuel drive (Track 1) by measuring chemical mix stresses.</li>
                    <li>Replaces costly, reactive "black-box" wear checks with continuous digital twin indicators.</li>
                    <li>Early warning prevents multi-million Naira shell deformation or unplanned outages.</li>
                  </ul>
                </div>
              </footer>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="max-w-[1400px] mx-auto w-full h-[650px]">
              <AlertCenter zones={zones} />
            </div>
          )}

          {activeTab === "hardware" && (
            <div className="max-w-[1400px] mx-auto w-full h-[650px]">
              <TelemetrySim
                zones={zones}
                selectedZoneId={selectedZoneId}
                isSimulating={isSimulating}
                onToggleSimulation={setIsSimulating}
                onTriggerFault={handleTriggerFault}
                onRefreshData={handleRefreshData}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
