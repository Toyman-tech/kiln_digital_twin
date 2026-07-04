"use client";

import React, { useState, useMemo } from "react";
import { KilnZone, generateHistoryData } from "@/utils/mockData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from "recharts";
import { TrendingDown, Calendar, Database, Eye } from "lucide-react";

interface WearChartsProps {
  selectedZone: KilnZone;
}

// Custom Premium Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#070b19]/95 border border-sky-500/20 p-3 rounded-xl shadow-2xl backdrop-blur-md font-mono text-[10px] space-y-1.5 select-none">
        <p className="font-bold text-slate-500 border-b border-slate-900 pb-1 mb-1">{label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-black text-slate-100">{item.value} {item.name.includes("Thickness") ? "mm" : "%"}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function WearCharts({ selectedZone }: WearChartsProps) {
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(90);
  const [activeParameter, setActiveParameter] = useState<"wear" | "both">("both");

  // Generate historical data based on current stress values
  const allHistory = useMemo(() => {
    return generateHistoryData(
      selectedZone.id, 
      selectedZone.rss, 
      selectedZone.weights,
      selectedZone.chlorine,
      selectedZone.sulfur,
      selectedZone.alkali
    );
  }, [
    selectedZone.id, 
    selectedZone.rss, 
    selectedZone.weights, 
    selectedZone.chlorine, 
    selectedZone.sulfur, 
    selectedZone.alkali
  ]);

  // Filter history based on time range selected
  const historyData = useMemo(() => {
    const cutoffIndex = Math.max(0, allHistory.length - Math.round(timeRange / 3));
    return allHistory.slice(cutoffIndex);
  }, [allHistory, timeRange]);

  return (
    <div className="glass-panel p-6 flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-900 mb-6 gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-sky-400">
            <TrendingDown className="w-5 h-5 text-sky-400 animate-pulse" />
            Historical Wear & Stress Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing wear trends and correlation with Alternative Fuel chemical index
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Parameter switch */}
          <div className="flex gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-900 self-start text-[10px]">
            <button
              onClick={() => setActiveParameter("wear")}
              className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                activeParameter === "wear"
                  ? "bg-slate-900 text-sky-400 border border-slate-800"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Lining Only
            </button>
            <button
              onClick={() => setActiveParameter("both")}
              className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                activeParameter === "both"
                  ? "bg-slate-900 text-sky-400 border border-slate-800"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Correlations
            </button>
          </div>

          {/* Time range switcher */}
          <div className="flex gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-900 self-start">
            {([30, 60, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  timeRange === days
                    ? "bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-stretch">
        {/* Chart 1: Remaining lining thickness trend */}
        <div className="flex flex-col bg-slate-950/30 p-4 rounded-2xl border border-slate-900">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Lining Thickness Trend
              </h4>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Nominal: {selectedZone.id === 3 ? "210mm" : selectedZone.id === 2 || selectedZone.id === 4 ? "230mm" : "250mm"}</span>
          </div>
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <filter id="glow-lining" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" opacity={0.6} />
                <XAxis dataKey="day" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis
                  domain={[60, 260]}
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="wearThickness"
                  name="Lining Thickness"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 1.5, strokeWidth: 1 }}
                  activeDot={{ r: 4 }}
                  filter="url(#glow-lining)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: RSS score vs Chem Infiltration factor */}
        <div className="flex flex-col bg-slate-950/30 p-4 rounded-2xl border border-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Alternative Fuel mix vs Stress Correlation
            </h4>
          </div>
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRss" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorChem" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow-rss" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" opacity={0.6} />
                <XAxis dataKey="day" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "9px", marginTop: "12px", fontFamily: "monospace" }} />
                
                {activeParameter === "both" && (
                  <Area
                    type="monotone"
                    dataKey="rss"
                    name="Refractory Stress (RSS)"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorRss)"
                    strokeWidth={2}
                    filter="url(#glow-rss)"
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey="chemFactor"
                  name="Alternative Fuel Index"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorChem)"
                  strokeWidth={2}
                  filter="url(#glow-rss)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
