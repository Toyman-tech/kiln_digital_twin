export interface KilnZone {
  id: number;
  name: string;
  startPos: number; // in meters from inlet
  endPos: number;   // in meters from inlet
  temp: number;      // Current shell temperature in °C
  tSpike: number;    // Spike factor (0 - 100)
  tCycle: number;    // Cycle factor (0 - 100)
  chemFactor: number; // Chemical infiltration factor (0 - 100)
  rss: number;       // Refractory Stress Score (0 - 100)
  wearThickness: number; // Estimated remaining refractory thickness in mm (nominal 250mm)
  wifiSignal: number;    // simulated RSSI in dBm
  sensorStatus: 'OK' | 'FAULT' | 'OPEN_CIRCUIT';
  cycleCount: number;    // thermal cycle count past 24h
  historicalSpikes: number;
}

export const INITIAL_ZONES: KilnZone[] = [
  {
    id: 1,
    name: "Calcining Zone",
    startPos: 0,
    endPos: 12,
    temp: 840,
    tSpike: 15,
    tCycle: 10,
    chemFactor: 35,
    rss: 0,
    wearThickness: 228,
    wifiSignal: -65,
    sensorStatus: 'OK',
    cycleCount: 2,
    historicalSpikes: 5
  },
  {
    id: 2,
    name: "Upper Transition Zone",
    startPos: 12,
    endPos: 27,
    temp: 1120,
    tSpike: 25,
    tCycle: 32,
    chemFactor: 45,
    rss: 0,
    wearThickness: 185,
    wifiSignal: -58,
    sensorStatus: 'OK',
    cycleCount: 6,
    historicalSpikes: 11
  },
  {
    id: 3,
    name: "Burning Zone", // The hottest zone (up to 2000°C internally, shell ~1300-1450°C max)
    startPos: 27,
    endPos: 45,
    temp: 1390,
    tSpike: 62,
    tCycle: 58,
    chemFactor: 60,
    rss: 0,
    wearThickness: 112,
    wifiSignal: -62,
    sensorStatus: 'OK',
    cycleCount: 14,
    historicalSpikes: 24
  },
  {
    id: 4,
    name: "Lower Transition Zone",
    startPos: 45,
    endPos: 57,
    temp: 1180,
    tSpike: 40,
    tCycle: 42,
    chemFactor: 50,
    rss: 0,
    wearThickness: 160,
    wifiSignal: -71,
    sensorStatus: 'OK',
    cycleCount: 8,
    historicalSpikes: 14
  },
  {
    id: 5,
    name: "Cooling Zone",
    startPos: 57,
    endPos: 67,
    temp: 790,
    tSpike: 8,
    tCycle: 15,
    chemFactor: 30,
    rss: 0,
    wearThickness: 235,
    wifiSignal: -64,
    sensorStatus: 'OK',
    cycleCount: 1,
    historicalSpikes: 3
  }
];

// Refractory Stress Score (RSS) Formula:
// RSS = (W1 * T_Spike) + (W2 * T_Cycle) + (W3 * Chem_Factor)
// W1 = 0.35, W2 = 0.45, W3 = 0.20
export const calculateRSS = (tSpike: number, tCycle: number, chemFactor: number): number => {
  const rss = (0.35 * tSpike) + (0.45 * tCycle) + (0.20 * chemFactor);
  return Math.min(100, Math.max(0, Math.round(rss)));
};

// Calculate thickness based on RSS
// Nominal brand new lining is 250mm. Refractory starts spalling under high stress.
export const calculateWearThickness = (rss: number, baseThickness: number = 250): number => {
  // Rough model: thickness declines as RSS climbs, and reaches critical (< 80mm) at very high RSS
  const wear = (rss / 100) * 170; // Max wear is 170mm, leaving 80mm remaining
  return Math.round(baseThickness - wear);
};

export interface HistoryPoint {
  day: string;
  rss: number;
  temp: number;
  wearThickness: number;
  chemFactor: number;
}

// Generate historical degradation wear data over the last 90 days
export const generateHistoryData = (zoneId: number, currentRSS: number): HistoryPoint[] => {
  const data: HistoryPoint[] = [];
  const now = new Date();
  
  // Base degradation profiles by zone
  let startThickness = 240;
  if (zoneId === 3) startThickness = 210; // Burning zone has thinner lining historically
  else if (zoneId === 2 || zoneId === 4) startThickness = 230;

  for (let i = 90; i >= 0; i -= 3) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dayString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Progressively degrade thickness, showing cumulative spalling effects
    const progression = (90 - i) / 90;
    
    // Add some random cycles and alternative fuel mix changes over time
    const randomShift = Math.sin(i * 0.2) * 5;
    const historicRSS = Math.round(
      Math.min(100, Math.max(10, (currentRSS * 0.7) + (progression * (currentRSS * 0.3)) + randomShift))
    );
    
    const historicTemp = Math.round(
      600 + (progression * 200) + Math.sin(i * 0.4) * 80 + (historicRSS * 2.5)
    );
    
    const currentWear = startThickness - (progression * (startThickness - calculateWearThickness(currentRSS, startThickness)));
    const historicWearThickness = Math.round(currentWear + Math.max(0, i * 0.2) + Math.random() * 2);
    
    const historicChem = Math.round(
      Math.min(100, Math.max(10, 30 + Math.sin(i * 0.1) * 15 + (historicRSS * 0.2)))
    );

    data.push({
      day: dayString,
      rss: historicRSS,
      temp: historicTemp,
      wearThickness: Math.min(250, Math.max(60, historicWearThickness)),
      chemFactor: historicChem
    });
  }
  return data;
};
