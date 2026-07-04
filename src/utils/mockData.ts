export interface ZoneWeights {
  wSpike: number;
  wCycle: number;
  wChem: number;
}

export interface FuelSpecs {
  name: string;
  chlorine: number; // wt%
  sulfur: number;   // wt%
  alkali: number;   // wt% (Na2O + K2O)
  isEstimated?: boolean;
}

export const FUEL_REFERENCE_TABLE: FuelSpecs[] = [
  { name: "Coal (Baseline)", chlorine: 0.05, sulfur: 1.00, alkali: 0.20 },
  { name: "RDF (Refuse Derived Fuel)", chlorine: 0.85, sulfur: 0.25, alkali: 1.40, isEstimated: true },
  { name: "Used Tires (TDF)", chlorine: 0.08, sulfur: 1.75, alkali: 0.45 },
  { name: "Rice Husk", chlorine: 0.12, sulfur: 0.08, alkali: 2.10, isEstimated: true },
  { name: "Sawdust", chlorine: 0.03, sulfur: 0.04, alkali: 0.70 },
  { name: "Palm Kernel Shell", chlorine: 0.08, sulfur: 0.12, alkali: 1.15, isEstimated: true }
];

export interface KilnZone {
  id: number;
  name: string;
  startPos: number; // in meters from inlet
  endPos: number;   // in meters from inlet
  temp: number;      // Current shell temperature in °C
  tSpike: number;    // Spike factor (0 - 100)
  tCycle: number;    // Cycle factor (0 - 100)
  // Sub-model Chemistry parameters:
  chlorine: number;    // wt%
  sulfur: number;      // wt%
  alkali: number;      // wt%
  selectedFuel: string; // fuel baseline name
  chemFactor: number;   // Calculated Chemical Factor (0 - 100)
  rss: number;       // Refractory Stress Score (0 - 100)
  wearThickness: number; // Estimated remaining refractory thickness in mm
  wifiSignal: number;    // simulated RSSI in dBm
  sensorStatus: 'OK' | 'FAULT' | 'OPEN_CIRCUIT';
  cycleCount: number;    // thermal cycle count past 24h
  historicalSpikes: number;
  weights: ZoneWeights;
}

// Zone-specific weight matrix generator
export const getZoneWeights = (zoneId: number): ZoneWeights => {
  switch (zoneId) {
    case 3: // Burning Zone - Volatiles condensation + highest heat
      return { wSpike: 0.40, wCycle: 0.25, wChem: 0.35 };
    case 2: // Upper Transition Zone - Condensation deposition
    case 4: // Lower Transition Zone - Condensation deposition
      return { wSpike: 0.25, wCycle: 0.40, wChem: 0.35 };
    case 1: // Calcining Zone - Medium temperatures
      return { wSpike: 0.20, wCycle: 0.55, wChem: 0.25 };
    case 5: // Cooling Zone - Thermal/Mechanical strain dominates
    default:
      return { wSpike: 0.35, wCycle: 0.55, wChem: 0.10 };
  }
};

// Chemical Factor weighted sub-model calculation
export const calculateChemFactor = (chlorine: number, sulfur: number, alkali: number): number => {
  // Cl is highly destructive (fuels above 0.5 wt% Cl cut refractory life 30-50%). Normalize Cl against 1.5 wt% limit.
  const clScore = Math.min(100, (chlorine / 1.5) * 100);
  
  // Sulfur forms alkali sulfates. Normalize S against 5.0 wt% limit.
  const sScore = Math.min(100, (sulfur / 5.0) * 100);
  
  // Alkalis act as the enabling reactants. Normalize Alkalis against 3.0 wt% limit.
  const alkScore = Math.min(100, (alkali / 3.0) * 100);

  // Weightings: Cl = 50% (highest), S = 30%, Alkalis = 20% (enabling reactant)
  const score = (0.50 * clScore) + (0.30 * sScore) + (0.20 * alkScore);
  return Math.min(100, Math.max(0, Math.round(score)));
};

// Refractory Stress Score (RSS) Formula with zone weights
export const calculateRSS = (tSpike: number, tCycle: number, chemFactor: number, weights: ZoneWeights): number => {
  const rss = (weights.wSpike * tSpike) + (weights.wCycle * tCycle) + (weights.wChem * chemFactor);
  return Math.min(100, Math.max(0, Math.round(rss)));
};

// Calculate lining thickness based on RSS
export const calculateWearThickness = (rss: number, baseThickness: number = 250): number => {
  const wear = (rss / 100) * 170; // Max wear leaves 80mm
  return Math.round(baseThickness - wear);
};

export const INITIAL_ZONES: KilnZone[] = [
  {
    id: 1,
    name: "Calcining Zone",
    startPos: 0,
    endPos: 12,
    temp: 840,
    tSpike: 15,
    tCycle: 10,
    chlorine: 0.05,
    sulfur: 1.00,
    alkali: 0.20,
    selectedFuel: "Coal (Baseline)",
    chemFactor: calculateChemFactor(0.05, 1.00, 0.20),
    rss: 0, // recalculated below
    wearThickness: 235,
    wifiSignal: -65,
    sensorStatus: 'OK',
    cycleCount: 2,
    historicalSpikes: 5,
    weights: getZoneWeights(1)
  },
  {
    id: 2,
    name: "Upper Transition Zone",
    startPos: 12,
    endPos: 27,
    temp: 1120,
    tSpike: 25,
    tCycle: 32,
    chlorine: 0.05,
    sulfur: 1.00,
    alkali: 0.20,
    selectedFuel: "Coal (Baseline)",
    chemFactor: calculateChemFactor(0.05, 1.00, 0.20),
    rss: 0,
    wearThickness: 215,
    wifiSignal: -58,
    sensorStatus: 'OK',
    cycleCount: 6,
    historicalSpikes: 11,
    weights: getZoneWeights(2)
  },
  {
    id: 3,
    name: "Burning Zone", // The hottest zone (hottest initial stress to trigger alert feed!)
    startPos: 27,
    endPos: 45,
    temp: 1390,
    tSpike: 78,
    tCycle: 68,
    chlorine: 0.85, // Pre-seeded RDF high Cl spike
    sulfur: 0.25,
    alkali: 1.40,
    selectedFuel: "RDF (Refuse Derived Fuel)",
    chemFactor: calculateChemFactor(0.85, 0.25, 1.40),
    rss: 0,
    wearThickness: 108,
    wifiSignal: -62,
    sensorStatus: 'OK',
    cycleCount: 14,
    historicalSpikes: 24,
    weights: getZoneWeights(3)
  },
  {
    id: 4,
    name: "Lower Transition Zone",
    startPos: 45,
    endPos: 57,
    temp: 1180,
    tSpike: 40,
    tCycle: 42,
    chlorine: 0.08, // Tires
    sulfur: 1.75,
    alkali: 0.45,
    selectedFuel: "Used Tires (TDF)",
    chemFactor: calculateChemFactor(0.08, 1.75, 0.45),
    rss: 0,
    wearThickness: 172,
    wifiSignal: -71,
    sensorStatus: 'OK',
    cycleCount: 8,
    historicalSpikes: 14,
    weights: getZoneWeights(4)
  },
  {
    id: 5,
    name: "Cooling Zone",
    startPos: 57,
    endPos: 67,
    temp: 790,
    tSpike: 8,
    tCycle: 15,
    chlorine: 0.05,
    sulfur: 1.00,
    alkali: 0.20,
    selectedFuel: "Coal (Baseline)",
    chemFactor: calculateChemFactor(0.05, 1.00, 0.20),
    rss: 0,
    wearThickness: 245,
    wifiSignal: -64,
    sensorStatus: 'OK',
    cycleCount: 1,
    historicalSpikes: 3,
    weights: getZoneWeights(5)
  }
];

// Initialize RSS scores correctly based on starting values
INITIAL_ZONES.forEach(z => {
  z.rss = calculateRSS(z.tSpike, z.tCycle, z.chemFactor, z.weights);
  const baseThick = z.id === 3 ? 210 : z.id === 2 || z.id === 4 ? 230 : 250;
  z.wearThickness = calculateWearThickness(z.rss, baseThick);
});

export interface HistoryPoint {
  day: string;
  rss: number;
  temp: number;
  wearThickness: number;
  chemFactor: number;
}

// Generate historical degradation wear data over the last 90 days with realistic chlorine spikes
export const generateHistoryData = (
  zoneId: number, 
  currentRSS: number, 
  zoneWeights: ZoneWeights,
  chlorine: number,
  sulfur: number,
  alkali: number
): HistoryPoint[] => {
  const data: HistoryPoint[] = [];
  const now = new Date();
  
  let startThickness = 240;
  if (zoneId === 3) startThickness = 210; 
  else if (zoneId === 2 || zoneId === 4) startThickness = 230;

  for (let i = 90; i >= 0; i -= 2) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dayString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const progression = (90 - i) / 90;
    
    // Base daily values
    let dayCl = 0.05;
    let dayS = 1.0;
    let dayAlk = 0.2;
    
    // Simulate Fuel Spikes during high-Cl trials (days 70-76 and days 35-42)
    const isRDFCampaign1 = i >= 35 && i <= 42; 
    const isRDFCampaign2 = i >= 70 && i <= 76;
    const isCurrentDay = i === 0;

    if (isRDFCampaign1) {
      dayCl = 0.55; // Above 0.5 wt% Cl warning threshold
      dayS = 0.8;
      dayAlk = 0.9;
    } else if (isRDFCampaign2) {
      dayCl = 0.85; // High Cl spike RDF campaign
      dayS = 0.4;
      dayAlk = 1.3;
    } else if (isCurrentDay) {
      dayCl = chlorine;
      dayS = sulfur;
      dayAlk = alkali;
    } else {
      // Normal minor variations
      dayCl = Math.max(0.02, 0.05 + Math.sin(i * 0.5) * 0.02);
      dayS = Math.max(0.2, 1.0 + Math.cos(i * 0.3) * 0.15);
      dayAlk = Math.max(0.1, 0.2 + Math.sin(i * 0.2) * 0.05);
    }
    
    const dayChemFactor = calculateChemFactor(dayCl, dayS, dayAlk);
    
    // Spike and cycle fluctuations
    let daySpike = Math.max(5, (isRDFCampaign1 || isRDFCampaign2 ? 65 : 25) + Math.sin(i * 0.4) * 10);
    let dayCycle = Math.max(5, (isRDFCampaign1 || isRDFCampaign2 ? 55 : 30) + Math.cos(i * 0.2) * 8);
    
    // Adjust for current day values
    if (isCurrentDay) {
      daySpike = Math.round(currentRSS * 0.4); 
      dayCycle = Math.round(currentRSS * 0.4);
    }
    
    const dayRSS = calculateRSS(daySpike, dayCycle, dayChemFactor, zoneWeights);
    
    // Accumulate structural fatigue / lining spalls
    let fatigueFactor = progression * 25; 
    if (i < 70) fatigueFactor += 12; // Accelerated wear drop from RDF campaign 2
    if (i < 35) fatigueFactor += 6;  // Accelerated wear drop from RDF campaign 1
    
    const wearThickness = Math.max(60, Math.min(250, startThickness - fatigueFactor + (Math.sin(i) * 2)));

    data.push({
      day: dayString,
      rss: dayRSS,
      temp: Math.round(1000 + dayRSS * 3.5 + Math.sin(i * 0.5) * 40),
      wearThickness: Math.round(wearThickness),
      chemFactor: dayChemFactor
    });
  }
  return data;
};
