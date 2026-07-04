# KilnGuard | Predictive Refractory & Digital Twin Early-Warning System

**KilnGuard** is an industrial predictive maintenance console and real-time digital twin dashboard designed for **Dangote Cement Plc** (Obajana Plant - Kiln 3). The system simulates ESP32 edge telemetry and runs real-time mathematical risk equations to predict refractory brick spalling and prevent catastrophic rotary kiln shell deformation.

---

## Key Features

1. **Rotational Digital Twin (`KilnModel`)**
   - Renders a 3D-like schematic of the rotary kiln with support tyres and a girth gear rotating in real-time synced with the RPM speed.
   - Interactive circular **Cross-Section Cutout** displaying the outer steel shell, the refractory brick layer (which scales in thickness and changes color in real-time based on calculated wear), and the internal combustion furnace flame.

2. **Mathematical Risk Engine (`RiskEngine`)**
   - Calculates the **Refractory Stress Score (RSS)** using three parameterized stress vectors.
   - Displays real-time circular SVG progress gauges for both RSS and estimated brick lining thickness.
   - Features custom-coefficient calibration panels to let plant engineers adjust model weights.

3. **ESP32 Edge Rig Simulator (`TelemetrySim`)**
   - Features an SVG schematic mockup of a physical ESP32 edge microcontroller with flashing PWR, TX, and cyan FAULT LEDs.
   - Includes a carbon-styled MQTT console parser showing incoming JSON packages with full key/value syntax highlighting.
   - Supports hardware fault injection (Open Circuit Fault) to test dashboard fail-safes.

4. **SAP PM ERP Alert Dispatcher (`AlertCenter`)**
   - Automatically generates draft maintenance work orders if a zone exceeds nominal temperature or stress limits.
   - Features text-search queries and status filter tabs (All, Draft, Dispatched).
   - Interactive configuration drawer allowing operators to assign specific technicians, configure priority levels, and append custom maintenance directives before syncing to the SAP PM system.

5. **Chrome Extension Mitigation**
   - Integrates global client-side unhandled rejection traps to suppress and ignore errors caused by external browser extensions (e.g. MetaMask `inpage.js` unconnected session rejections), preventing dashboard interruption.

---

## Mathematical Model

### Refractory Stress Score (RSS)
The algorithm estimates lining degradation rate by weighting thermal spikes, rapid cooling cycles, and chemical fuel mix stress:

$$\text{RSS} = (w_{\text{Spike}} \times T_{\text{Spike}}) + (w_{\text{Cycle}} \times T_{\text{Cycle}}) + (w_{\text{Chem}} \times \text{Chem}_{\text{Factor}})$$

*Nominal Calibration:*
- **$w_{\text{Spike}}$ (35%):** Duration and intensity exceeding critical shell threshold.
- **$w_{\text{Cycle}}$ (45%):** Rate of rapid temperature cooling drops ($>50^\circ\text{C/hr}$) triggering spalling.
- **$w_{\text{Chem}}$ (20%):** Chemical mix index measuring sulfur/chlorine infiltration from alternative fuels.

### Wear Thickness Estimation
Refractory brick thickness degrades linearly as the Refractory Stress Score (RSS) increases:

$$\text{Thickness} = \text{Base Thickness} - \left( \frac{\text{RSS}}{100} \times 170\text{mm} \right)$$

*Nominal parameters:*
- **Burning Zone Base Thickness:** 210mm
- **Transition Zone Base Thickness:** 230mm
- **Calcining & Cooling Zone Base Thickness:** 250mm
- Critical alarm thresholds trigger when remaining thickness drops below **120mm**.

---

## Technology Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack enabled)
- **Runtime & Render**: React 19.2
- **Styling**: Tailwind CSS v4 (with custom cyber-grid scanline overlays)
- **Charts**: Recharts (enhanced with SVG drop-shadow filter glow effects)
- **Icons**: Lucide React

---

## Installation & Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to view the console.

3. **Build the production bundle**:
   ```bash
   npm run build
   ```
   Verifies TypeScript checks and optimizes static pages for static deployment.
