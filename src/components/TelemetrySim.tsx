"use client";

import React, { useState, useEffect, useRef } from "react";
import { KilnZone } from "@/utils/mockData";
import { Wifi, Cpu, AlertTriangle, Play, Pause, RefreshCw, Terminal, Signal } from "lucide-react";

interface TelemetrySimProps {
  zones: KilnZone[];
  selectedZoneId: number;
  isSimulating: boolean;
  onToggleSimulation: (active: boolean) => void;
  onTriggerFault: (zoneId: number, faultStatus: 'OK' | 'FAULT' | 'OPEN_CIRCUIT') => void;
  onRefreshData: () => void;
}

export default function TelemetrySim({
  zones,
  selectedZoneId,
  isSimulating,
  onToggleSimulation,
  onTriggerFault,
  onRefreshData,
}: TelemetrySimProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [txActive, setTxActive] = useState<boolean>(false);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Generate logs when zones telemetry updates
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Pick a random zone to stream telemetry for
      const randZone = zones[Math.floor(Math.random() * zones.length)];
      const payload = {
        device_id: `esp32_dcp_k3_z${randZone.id}`,
        timestamp: Math.round(Date.now() / 1000),
        telemetry: {
          shell_temp_c: randZone.temp,
          spike_factor: randZone.tSpike,
          cycle_count: randZone.cycleCount,
          chem_index: randZone.chemFactor,
          rss_score: randZone.rss,
          remaining_lining_mm: randZone.wearThickness
        },
        diagnostics: {
          wifi_rssi_dbm: randZone.wifiSignal,
          sensor_state: randZone.sensorStatus,
          uptime_sec: Math.round(performance.now() / 1000)
        }
      };

      // Trigger a brief flash on the TX LED
      setTxActive(true);
      setTimeout(() => setTxActive(false), 200);

      setLogs((prev) => [...prev.slice(-30), JSON.stringify(payload, null, 2)]);
    }, 1500);

    return () => clearInterval(interval);
  }, [zones, isSimulating]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Clear logs helper
  const clearConsole = () => setLogs([]);

  // Syntax highlighting helper for JSON logs
  const renderHighlightedJSON = (jsonStr: string) => {
    return jsonStr.split("\n").map((line, i) => {
      const keyMatch = line.match(/^(\s*)"([^"]+)":/);
      const valueMatch = line.match(/:\s*(.*)$/);
      
      if (keyMatch) {
        const indent = keyMatch[1];
        const key = keyMatch[2];
        let valuePart = valueMatch ? valueMatch[1] : "";
        
        let valSpan = <span className="text-slate-300">{valuePart}</span>;
        if (valuePart.includes('"')) {
          valSpan = <span className="text-emerald-400">{valuePart}</span>;
        } else if (valuePart.match(/[0-9]+/)) {
          valSpan = <span className="text-amber-400 font-bold">{valuePart}</span>;
        } else if (valuePart.includes("true") || valuePart.includes("false")) {
          valSpan = <span className="text-indigo-400 font-bold">{valuePart}</span>;
        } else if (valuePart.includes("null")) {
          valSpan = <span className="text-rose-400 font-bold">{valuePart}</span>;
        }

        return (
          <div key={i} className="leading-5">
            {indent}
            <span className="text-sky-400 font-semibold">"{key}"</span>
            <span className="text-slate-500">: </span>
            {valSpan}
          </div>
        );
      }
      return <div key={i} className="leading-5 text-slate-500">{line}</div>;
    });
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-sky-400">
          <Cpu className="w-5 h-5 text-sky-400 animate-pulse" />
          ESP32 Hardware Rig Simulator
        </h3>
        <button
          onClick={() => onToggleSimulation(!isSimulating)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
            isSimulating
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
          }`}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause Simulation
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Start Simulation
            </>
          )}
        </button>
      </div>

      {/* Grid: Board SVG Visualizer & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 items-stretch select-none">
        
        {/* PCB Board SVG Graphic */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex flex-col items-center justify-between min-h-[160px]">
          <div className="w-full flex justify-between items-center pb-2 border-b border-slate-900/60 mb-2">
            <span className="text-[9px] font-mono font-bold text-slate-500">MCU SCHEMATIC MOCK</span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
              <Signal className="w-3 h-3 text-sky-400" /> {selectedZone.wifiSignal} dBm
            </span>
          </div>

          <svg viewBox="0 0 150 100" className="w-36 h-24">
            {/* PCB outline */}
            <rect x="5" y="5" width="140" height="90" rx="4" fill="#090d1a" stroke="#1e293b" strokeWidth="1.5" />
            
            {/* Pins Headers */}
            <line x1="12" y1="10" x2="12" y2="90" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3 2" />
            <line x1="138" y1="10" x2="138" y2="90" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3 2" />
            
            {/* ESP32 Module Chip */}
            <rect x="45" y="25" width="60" height="48" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            
            {/* Ant Pattern */}
            <rect x="50" y="28" width="50" height="10" fill="#020617" />
            <path d="M52,33 H98" stroke="#475569" strokeWidth="1" />
            
            {/* Metallic core label */}
            <rect x="53" y="42" width="44" height="25" rx="1" fill="#475569" stroke="#64748b" strokeWidth="1" />
            <text x="75" y="52" fill="#e2e8f0" fontSize="5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              ESP32-WROOM
            </text>
            <text x="75" y="60" fill="#94a3b8" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
              DCP PILOT K3
            </text>
            
            {/* LEDs */}
            {/* Power LED (Red) */}
            <circle cx="25" cy="25" r="2.5" fill="#ef4444" filter="drop-shadow(0 0 2px #ef4444)" />
            <text x="25" y="32" fill="#64748b" fontSize="4" fontFamily="monospace" textAnchor="middle">PWR</text>
            
            {/* TX LED (Orange, blinks) */}
            <circle 
              cx="25" 
              cy="48" 
              r="2.5" 
              fill={isSimulating && txActive ? "#f97316" : "#1e293b"} 
              filter={isSimulating && txActive ? "drop-shadow(0 0 4px #f97316)" : "none"} 
              className="transition-colors duration-100"
            />
            <text x="25" y="55" fill="#64748b" fontSize="4" fontFamily="monospace" textAnchor="middle">TX</text>
            
            {/* Status LED (Cyan, glows on faults) */}
            <circle 
              cx="25" 
              cy="70" 
              r="2.5" 
              fill={selectedZone.sensorStatus !== 'OK' ? "#06b6d4" : "#1e293b"} 
              filter={selectedZone.sensorStatus !== 'OK' ? "drop-shadow(0 0 4px #06b6d4)" : "none"} 
              className="transition-colors duration-100"
            />
            <text x="25" y="77" fill="#64748b" fontSize="4" fontFamily="monospace" textAnchor="middle">FAULT</text>
          </svg>

          <span className="text-[10px] font-mono font-bold text-slate-300">
            node_dcp_k3_z{selectedZone.id} (Online)
          </span>
        </div>

        {/* Diagnostics & Fault Injection */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between min-h-[160px]">
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-500">FAULT INJECTION CONTROL</span>
            <h4 className="text-xs font-bold text-slate-200 mt-1">Thermocouple Sensor</h4>
            <p className="text-[10px] text-slate-500 mt-1">Simulate edge node communication faults or hardware failure.</p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => onTriggerFault(selectedZone.id, 'OK')}
              className={`text-[10px] py-1.5 px-3 rounded-lg font-mono font-bold transition-all border cursor-pointer ${
                selectedZone.sensorStatus === 'OK'
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
              }`}
            >
              OK (Normal Operations)
            </button>
            <button
              onClick={() => onTriggerFault(selectedZone.id, 'OPEN_CIRCUIT')}
              className={`text-[10px] py-1.5 px-3 rounded-lg font-mono font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                selectedZone.sensorStatus === 'OPEN_CIRCUIT'
                  ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
                  : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> OPEN CIRCUIT FAULT
            </button>
          </div>
        </div>
      </div>

      {/* Terminal payload console */}
      <div className="flex-1 flex flex-col bg-black border border-slate-900 rounded-2xl p-4 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-900/60 mb-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            MQTT JSON Broker Stream
          </span>
          <button
            onClick={clearConsole}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold cursor-pointer"
          >
            Clear logs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 text-slate-400 select-text font-mono">
          {logs.length === 0 ? (
            <p className="text-slate-600 text-center italic mt-12 text-[11px]">
              {isSimulating
                ? "Awaiting first payload package from MQTT broker..."
                : "Simulation is paused. Start simulation to inspect incoming payload stream."}
            </p>
          ) : (
            logs.map((log, idx) => (
              <pre
                key={idx}
                className="bg-slate-950/90 p-3 rounded-xl border border-slate-900/80 text-[10px] leading-relaxed overflow-x-auto whitespace-pre font-mono"
              >
                {renderHighlightedJSON(log)}
              </pre>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}
