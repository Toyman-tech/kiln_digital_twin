"use client";

import React, { useState, useEffect } from "react";
import { KilnZone } from "@/utils/mockData";
import { AlertCircle, Wrench, ShieldAlert, CheckCircle, Send, ClipboardList, Search, Filter, User, Clock, ChevronRight, X, ShieldCheck } from "lucide-react";

interface AlertCenterProps {
  zones: KilnZone[];
}

interface WorkOrder {
  id: string;
  zoneName: string;
  severity: "WARNING" | "CRITICAL";
  description: string;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED";
  createdAt: string;
  technician?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  notes?: string;
}

export default function AlertCenter({ zones }: AlertCenterProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DRAFT" | "DISPATCHED">("ALL");
  const [activeDispatchWo, setActiveDispatchWo] = useState<WorkOrder | null>(null);
  
  // Form States for Dispatching
  const [techName, setTechName] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "EMERGENCY">("HIGH");
  const [dispatchNotes, setDispatchNotes] = useState("");

  // Automatically generate draft work orders when a zone stress (RSS) is high
  useEffect(() => {
    zones.forEach((zone) => {
      // Check if we already have an active work order for this zone
      const exists = workOrders.some(
        (wo) => wo.zoneName === zone.name && (wo.status === "DRAFT" || wo.status === "DISPATCHED")
      );

      if (exists) return;

      let severity: "WARNING" | "CRITICAL" | null = null;
      let description = "";

      if (zone.rss >= 75) {
        severity = "CRITICAL";
        description = `CRITICAL: Hot spot detected on shell at ${zone.startPos}m–${zone.endPos}m. Refractory Stress is ${zone.rss}%. Remaining lining thin (${zone.wearThickness}mm). Schedule cooling profile.`;
      } else if (zone.rss >= 40) {
        severity = "WARNING";
        description = `WARNING: Accelerated refractory wear in ${zone.name}. Remaining thickness estimated at ${zone.wearThickness}mm. Schedule visual shell inspection during next outage.`;
      }

      if (severity) {
        const newOrder: WorkOrder = {
          id: `WO-DCP-${Math.floor(1000 + Math.random() * 9000)}`,
          zoneName: zone.name,
          severity,
          description,
          status: "DRAFT",
          createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setWorkOrders((prev) => [newOrder, ...prev]);
      }
    });
  }, [zones]);

  const openDispatchForm = (wo: WorkOrder) => {
    setActiveDispatchWo(wo);
    setTechName("");
    setPriorityLevel(wo.severity === "CRITICAL" ? "EMERGENCY" : "MEDIUM");
    setDispatchNotes("");
  };

  const confirmDispatch = () => {
    if (!activeDispatchWo) return;
    
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === activeDispatchWo.id
          ? {
              ...wo,
              status: "DISPATCHED",
              technician: techName || "Default Plant Team B",
              priority: priorityLevel,
              notes: dispatchNotes || "Initiated core probe inspection."
            }
          : wo
      )
    );
    setActiveDispatchWo(null);
  };

  // Filter and search logic
  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = wo.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          wo.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || wo.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getSeverityStyle = (severity: "WARNING" | "CRITICAL") => {
    return severity === "CRITICAL"
      ? {
          bg: "bg-red-500/10 border-red-500/20",
          text: "text-red-400",
          icon: <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />,
          label: "Emergency Escalation"
        }
      : {
          bg: "bg-amber-500/10 border-amber-500/20",
          text: "text-amber-400",
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
          label: "Planned Maintenance"
        };
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full overflow-hidden select-none relative">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4 shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2 text-sky-400">
          <ClipboardList className="w-5 h-5 text-sky-400" />
          Maintenance Escalation Alert Center
        </h3>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
          SAP PM Integration: ACTIVE
        </span>
      </div>

      {/* Dispatch form modal overlays if active */}
      {activeDispatchWo && (
        <div className="absolute inset-0 bg-[#060814]/90 backdrop-blur-sm z-40 p-6 flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-900">
              <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                Configure SAP PM Dispatch
              </h4>
              <button 
                onClick={() => setActiveDispatchWo(null)}
                className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 font-mono text-[10px] text-slate-400">
                <strong className="text-slate-300 font-bold block mb-0.5">Asset Reference:</strong>
                {activeDispatchWo.zoneName} ({activeDispatchWo.id})
              </div>

              {/* Technician Input */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold font-mono text-[10px]">Assign Plant Technician / Crew</label>
                <div className="relative flex items-center">
                  <User className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    placeholder="e.g. Inspector Aliyu Ibrahim"
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 pl-8 pr-3 focus:outline-none focus:border-sky-500 text-xs text-slate-300"
                  />
                </div>
              </div>

              {/* Priority Select */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold font-mono text-[10px]">Dispatch Priority Code</label>
                <select
                  value={priorityLevel}
                  onChange={(e: any) => setPriorityLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-3 focus:outline-none focus:border-sky-500 text-xs text-slate-300"
                >
                  <option value="LOW">LOW (Deferred maintenance)</option>
                  <option value="MEDIUM">MEDIUM (Scheduled next stoppage)</option>
                  <option value="HIGH">HIGH (Escalate core inspection)</option>
                  <option value="EMERGENCY">EMERGENCY (Immediate thermal shutdown)</option>
                </select>
              </div>

              {/* Notes Area */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold font-mono text-[10px]">Maintenance Notes / Directive</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Carry out immediate ultrasonic shell profiling at specific meter positions..."
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-3 focus:outline-none focus:border-sky-500 text-xs text-slate-300 h-16 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-900">
            <button
              onClick={() => setActiveDispatchWo(null)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDispatch}
              className="text-xs bg-sky-500 hover:bg-sky-600 text-slate-950 px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/10"
            >
              <Send className="w-3.5 h-3.5" />
              Confirm SAP ERP Sync
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0">
        {/* Search */}
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by zone or work order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-sky-500 text-slate-300 placeholder:text-slate-600"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900 text-[10px]">
          {(["ALL", "DRAFT", "DISPATCHED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === status
                  ? "bg-slate-900 text-sky-400 border border-slate-800"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Escalation Alerts Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {filteredWorkOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 italic text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
            No alarms match status parameters. Refractory states nominal.
          </div>
        ) : (
          filteredWorkOrders.map((wo) => {
            const style = getSeverityStyle(wo.severity);
            return (
              <div
                key={wo.id}
                className={`p-4 rounded-2xl border transition-all duration-300 ${style.bg} hover:bg-slate-950/40`}
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-slate-900 ${style.text}`}>
                        {style.label}
                      </span>
                      <h4 className="text-xs text-slate-200 font-bold mt-1">
                        {wo.zoneName} – Code {wo.id}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{wo.createdAt}</span>
                </div>

                {/* Body Text */}
                <p className="text-xs text-slate-300 leading-relaxed my-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 font-mono">
                  {wo.description}
                </p>

                {/* Dispatch Details Metadata if synced */}
                {wo.status === "DISPATCHED" && (
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-2.5 mb-3 font-mono text-[9px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Technician Crew:</span>
                      <strong className="text-slate-200">{wo.technician}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>SAP Sync Priority:</span>
                      <strong className={`font-bold ${
                        wo.priority === "EMERGENCY" ? "text-red-400" : wo.priority === "HIGH" ? "text-amber-400" : "text-sky-400"
                      }`}>{wo.priority}</strong>
                    </div>
                    <div className="flex flex-col border-t border-slate-900/80 mt-1 pt-1 text-slate-500">
                      <span>ERP Directive:</span>
                      <span className="text-slate-300 italic mt-0.5">"{wo.notes}"</span>
                    </div>
                  </div>
                )}

                {/* Action footer */}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">State:</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      wo.status === "DRAFT" ? "text-amber-400" : "text-sky-400"
                    }`}>
                      {wo.status}
                    </span>
                  </div>

                  {wo.status === "DRAFT" ? (
                    <button
                      onClick={() => openDispatchForm(wo)}
                      className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-500/10 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Approve & Dispatch SAP
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Synced to SAP PM ERP
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
