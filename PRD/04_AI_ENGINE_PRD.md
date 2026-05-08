# AI ENGINE PRD: Intelligent Traffic Light Control Algorithm Specifications

**Project Name:** Offline AI Traffic Light Control Demonstration Engine  
**Document Type:** AI Engine Product Requirements Document  
**Version:** 1.0  
**Date:** 2026-05-07  

---

## 1. AI ENGINE OVERVIEW

The AI Engine is the "intelligent brain" of the traffic light control system. It continuously analyzes real-time traffic conditions and makes dynamic decisions about signal timing to optimize traffic flow, reduce congestion, and prioritize emergency vehicles.

### Core Philosophy
- **Adaptive:** Responds to changing traffic conditions in real-time
- **Fair:** Balances flow across all directions fairly
- **Responsive:** Adjusts immediately to emergency vehicles
- **Transparent:** All decisions are explainable and visible

---

## 2. INPUT DATA SOURCES

The AI Engine receives input from multiple sensors and monitoring systems:

### 2.1 Traffic Monitoring Data

**Per-Road Metrics (Updated Every 1-2 Seconds):**

| Data Point | Source | Range | Purpose |
|-----------|--------|-------|---------|
| Vehicle Count | Vehicle Detection | 0-100+ | Density assessment |
| Average Speed | Camera/Tracking | 0-2.5 units/s | Flow analysis |
| Queue Length | Position Detection | 0-500px | Congestion level |
| Wait Time | Vehicle History | 0-120s | Driver experience |
| Lane Utilization | Positional Data | 0-100% | Efficiency metrics |

**Intersection-Level Metrics:**

| Data Point | Source | Range | Purpose |
|-----------|--------|-------|---------|
| Traffic Density | Aggregated | Low/Med/High | Signal timing basis |
| Flow Rate | Throughput Count | 0-100 veh/min | System efficiency |
| Congestion Index | Composite | 0-100% | Overall health |
| Clearance Time | Vehicle Exit Rate | 0s-60s | Cycle planning |

### 2.2 Emergency Vehicle Detection

**Input:**
- Vehicle type classification (emergency vs. normal)
- Vehicle location (which road/lane)
- Vehicle speed (typically > 2.0 units/s)
- Siren activation status (audio signature in real system)

**Detection Method (for prototype):**
- Vehicle color/marker identification
- Manual trigger via UI button (for demo purposes)
- Optional: Speed threshold detection (vehicle moving significantly faster)

---

## 3. TRAFFIC DENSITY CLASSIFICATION

The foundation of AI decision-making is classifying traffic density into three levels:

### 3.1 Density Classification Algorithm

```
DENSITY = (Vehicle_Count × Vehicle_Average_Wait_Time) / Road_Length

Classification Rules:
- LOW:    Density ≤ 3  (0-3 vehicles, or low wait times)
- MEDIUM: 3 < Density ≤ 7  (4-7 vehicles, or moderate wait)
- HIGH:   Density > 7  (8+ vehicles, or long wait times)
```

**Implementation:**

```javascript
function calculateTrafficDensity(roadId) {
  const vehicles = getAllVehiclesOnRoad(roadId);
  const vehicleCount = vehicles.length;
  
  // Calculate average wait time (time spent at red lights)
  const avgWaitTime = vehicles.length > 0
    ? vehicles.reduce((sum, v) => sum + v.waitTime, 0) / vehicles.length
    : 0;
  
  // Calculate average speed (0-2.5)
  const avgSpeed = vehicles.length > 0
    ? vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length
    : 2.5;
  
  // Calculate density score
  const densityScore = (vehicleCount * 2) + (avgWaitTime / 10);
  
  // Classify
  let density = 'low';
  if (densityScore > 7) {
    density = 'high';
  } else if (densityScore > 3) {
    density = 'medium';
  }
  
  return {
    count: vehicleCount,
    density: density,
    avgWaitTime: avgWaitTime,
    avgSpeed: avgSpeed,
    densityScore: densityScore
  };
}
```

### 3.2 Density Metrics

**Low Density:**
- Vehicle Count: 0-3
- Average Wait Time: < 5 seconds
- Characteristics: Free-flowing traffic, minimal queuing
- Signal Strategy: Shorter cycle times (15-20s per direction)

**Medium Density:**
- Vehicle Count: 4-7
- Average Wait Time: 5-15 seconds
- Characteristics: Moderate traffic, some queuing
- Signal Strategy: Balanced cycle times (20-25s per direction)

**High Density:**
- Vehicle Count: 8+
- Average Wait Time: 15+ seconds
- Characteristics: Congested, significant queuing
- Signal Strategy: Longer cycle times (30-35s per direction)

---

## 4. CORE AI DECISION ALGORITHM

The AI makes decisions every 1-2 seconds (10-20 frames @ 60fps) to determine:
1. Which direction should get the green light
2. How long should the green light last
3. Should an emergency vehicle override normal operation

### 4.1 Decision Cycle

```
1. COLLECT DATA (100ms)
   ├─ Get vehicle counts per road
   ├─ Calculate density per direction
   ├─ Check for emergency vehicles
   └─ Aggregate metrics

2. ANALYZE (50ms)
   ├─ Compare N-S vs E-W density
   ├─ Calculate optimal signal duration
   ├─ Check emergency priority
   └─ Generate decision

3. EXECUTE (50ms)
   ├─ Update signal states
   ├─ Broadcast decision to UI
   ├─ Log metrics
   └─ Schedule next cycle
```

### 4.2 Main Algorithm (Pseudo-code)

```javascript
function makeAIDecision() {
  // Step 1: Collect Current Data
  const nsData = analyzeDirection('north-south'); // N-S
  const ewData = analyzeDirection('east-west');   // E-W
  
  // nsData = {
  //   vehicleCount: number,
  //   density: 'low'|'medium'|'high',
  //   avgWaitTime: number,
  //   avgSpeed: number
  // }
  
  // Step 2: Check Emergency Priority
  if (emergencyVehicleActive) {
    return handleEmergencyVehicle(emergencyVehicleLocation);
  }
  
  // Step 3: Compare Densities
  const nsDensityScore = calculateDensityScore(nsData);
  const ewDensityScore = calculateDensityScore(ewData);
  
  // Step 4: Make Signal Allocation Decision
  let decision = {};
  
  if (nsDensityScore > ewDensityScore + 2) {
    // N-S is significantly more congested
    decision = {
      greenDirection: 'NS',
      nsDuration: 30,  // Longer green for N-S
      ewDuration: 20   // Shorter green for E-W
    };
  } else if (ewDensityScore > nsDensityScore + 2) {
    // E-W is significantly more congested
    decision = {
      greenDirection: 'EW',
      nsDuration: 20,
      ewDuration: 30
    };
  } else {
    // Roughly equal - use balanced allocation
    decision = {
      greenDirection: 'BALANCED',
      nsDuration: 25,
      ewDuration: 25
    };
  }
  
  // Step 5: Enforce Constraints
  decision.nsDuration = Math.max(15, Math.min(35, decision.nsDuration));
  decision.ewDuration = Math.max(15, Math.min(35, decision.ewDuration));
  
  // Step 6: Execute Decision
  executeLightChange(decision);
  
  // Step 7: Log Decision
  logAIDecision(decision, nsData, ewData);
  
  return decision;
}
```

### 4.3 Density Score Calculation

```javascript
function calculateDensityScore(directionData) {
  const {vehicleCount, avgWaitTime, avgSpeed} = directionData;
  
  // Weighted scoring formula
  const vehicleScore = vehicleCount * 2;      // Weight: 2
  const waitScore = avgWaitTime / 5;          // Weight: 1
  const speedScore = (2.5 - avgSpeed) * 3;    // Weight: 3 (lower speed = higher score)
  
  const totalScore = vehicleScore + waitScore + speedScore;
  
  return totalScore;
}

// Example:
// N-S: 8 vehicles, 10s wait, 1.0 avg speed
// Score = (8*2) + (10/5) + ((2.5-1.0)*3) = 16 + 2 + 4.5 = 22.5

// E-W: 3 vehicles, 2s wait, 2.3 avg speed
// Score = (3*2) + (2/5) + ((2.5-2.3)*3) = 6 + 0.4 + 0.6 = 7.0

// Difference: 22.5 - 7.0 = 15.5 (highly skewed toward N-S)
```

---

## 5. SIGNAL TIMING OPTIMIZATION

### 5.1 Timing Constraints

```javascript
const timingConstraints = {
  minDuration: 15,      // Minimum time before switching
  maxDuration: 35,      // Maximum time per direction
  yellowLightDuration: 3, // Fixed yellow period
  minGreenBeforeYellow: 5, // Don't switch during brief green
  
  // Constraint: Total cycle time
  maxCycleTime: 70,     // N-S(35) + Yellow(3) + E-W(35) + Yellow(3) = 76
}
```

### 5.2 Duration Calculation Formula

```javascript
function calculateOptimalDuration(densityScore, currentLoad) {
  // Base duration: 25 seconds
  const baseDuration = 25;
  
  // Adjustment based on density score
  const densityAdjustment = Math.min(10, densityScore / 2);
  
  // Load factor: if opposite direction is completely clear, don't wait
  const loadFactor = currentLoad > 0 ? 1.0 : 0.5;
  
  const duration = baseDuration + densityAdjustment;
  
  // Enforce constraints
  return Math.max(15, Math.min(35, duration));
}

// Examples:
// Low density (score = 5):  duration = 25 + 2.5 = 27.5 → 28s
// High density (score = 20): duration = 25 + 10 = 35s (capped)
// Clear (score = 0):        duration = 25 + 0 = 25s
```

### 5.3 Adaptive Timing Algorithm

```javascript
function adaptiveSignalTiming(nsData, ewData, currentLight) {
  const nScore = calculateDensityScore(nsData);
  const eScore = calculateDensityScore(ewData);
  
  // If currently showing N-S green
  if (currentLight.direction === 'NS' && currentLight.state === 'GREEN') {
    // Check if should extend or switch
    if (nScore > eScore + 5) {
      // N-S is heavily congested - extend green
      return {
        duration: 35, // Max duration
        transition: 'extend'
      };
    } else if (eScore > nScore + 3) {
      // E-W becoming congested - switch soon
      return {
        duration: 20, // Min duration
        transition: 'switch'
      };
    } else {
      // Balanced - normal duration
      return {
        duration: 25,
        transition: 'normal'
      };
    }
  }
  
  // Similar logic for E-W green...
}
```

---

## 6. EMERGENCY VEHICLE PRIORITY LOGIC

Emergency vehicles are the highest priority and bypass all normal rules.

### 6.1 Emergency Vehicle Detection

**Detection Triggers:**
1. **Manual Trigger:** User clicks "Emergency Vehicle" button
2. **Automatic Detection:** Vehicle marked as `isEmergency = true` (in real system: siren detection)
3. **Speed Threshold:** Vehicle moving significantly faster than traffic (optional)

```javascript
function detectEmergencyVehicle(vehicle) {
  // Method 1: Explicit flag
  if (vehicle.isEmergency) return true;
  
  // Method 2: Speed threshold
  if (vehicle.speed > 3.0 && otherVehiclesAveragingLess(2.0)) {
    return true;
  }
  
  // Method 3: Color detection (in real system: vehicle appearance)
  if (vehicle.color === '#ff6432') return true;
  
  return false;
}
```

### 6.2 Emergency Vehicle Signal Override

**Upon Emergency Detection:**

```javascript
function handleEmergencyVehicle(emergencyVehicle) {
  // Step 1: Identify vehicle location
  const roadId = emergencyVehicle.roadId;
  const isNS = (roadId === 'top' || roadId === 'bottom'); // North-South
  
  // Step 2: Immediately set green for emergency direction
  if (isNS) {
    // Emergency on N-S road
    trafficLights['main_ns'].state = 'green';
    trafficLights['main_ns'].remainingDuration = 60; // Extended time
    trafficLights['main_ew'].state = 'red';
    trafficLights['main_ew'].remainingDuration = 0;
  } else {
    // Emergency on E-W road
    trafficLights['main_ns'].state = 'red';
    trafficLights['main_ew'].state = 'green';
    trafficLights['main_ew'].remainingDuration = 60;
  }
  
  // Step 3: Set emergency mode flag
  systemState.emergencyMode = true;
  systemState.emergencyVehicleId = emergencyVehicle.id;
  systemState.emergencyStartTime = currentTime;
  
  // Step 4: Monitor emergency vehicle
  // When vehicle exits intersection, reset to normal operation
  
  return {
    type: 'EMERGENCY_OVERRIDE',
    vehicleId: emergencyVehicle.id,
    direction: isNS ? 'NS' : 'EW',
    duration: 60,
    timestamp: currentTime
  };
}
```

### 6.3 Emergency Vehicle Clearance

**Exit Condition:**

```javascript
function checkEmergencyVehicleExit() {
  if (!systemState.emergencyMode) return;
  
  const emergencyVehicle = findVehicleById(systemState.emergencyVehicleId);
  
  // Check 1: Vehicle has exited intersection area
  if (!emergencyVehicle || emergencyVehicle.position > intersectionExit) {
    // Vehicle has cleared intersection
    systemState.emergencyMode = false;
    systemState.emergencyVehicleId = null;
    
    // Resume normal operation
    resetNormalSignalControl();
    
    return true;
  }
  
  // Check 2: Timeout (vehicle stuck for 2+ minutes)
  if (currentTime - systemState.emergencyStartTime > 120) {
    console.warn('Emergency override timeout - resuming normal operation');
    systemState.emergencyMode = false;
    resetNormalSignalControl();
    return true;
  }
  
  return false;
}
```

### 6.4 Emergency Priority Behavior

**While Emergency Mode Active:**

| Aspect | Behavior |
|--------|----------|
| **Signal Control** | Green for emergency direction only |
| **Normal Traffic** | Must stop (red light) on other roads |
| **Duration** | Extends until emergency vehicle exits |
| **Other Emergencies** | Second emergency queues until first clears |
| **Pedestrian Signals** | Deactivated for safety |
| **Decision Updates** | Paused (AI doesn't recalculate) |

---

## 7. DECISION LOGIC DISPLAY (FOR UI)

The AI Engine must output its reasoning for display on the UI. This makes the system transparent and educational.

### 7.1 Decision Explanation Format

```javascript
const aiDecisionExplanation = {
  timestamp: '14:23:45',
  
  // Current State Analysis
  currentState: {
    northSouth: {
      vehicleCount: 12,
      avgWaitTime: 15.3,
      avgSpeed: 0.8,
      density: 'high'
    },
    eastWest: {
      vehicleCount: 4,
      avgWaitTime: 2.1,
      avgSpeed: 2.3,
      density: 'low'
    }
  },
  
  // Decision Logic
  decisionLogic: [
    'N-S density score: (12×2) + (15.3÷5) + ((2.5-0.8)×3) = 24 + 3 + 5.1 = 32.1',
    'E-W density score: (4×2) + (2.1÷5) + ((2.5-2.3)×3) = 8 + 0.4 + 0.6 = 9',
    'Difference: 32.1 - 9 = 23.1 (highly skewed toward N-S)',
    'N-S congestion is critical → Allocate longer green time'
  ],
  
  // Decision
  decision: {
    command: 'Activate Green: N-S',
    nsDuration: 32,
    ewDuration: 18,
    rationale: 'N-S has 23 more vehicle equivalents; allocate 32s vs 18s'
  },
  
  // Priority Checks
  priorityCheck: {
    emergencyDetected: false,
    pedestrianRequest: false,
    systemHealth: 'NORMAL'
  },
  
  // Metrics
  expectedOutcome: {
    estimatedNSClearance: 28,
    estimatedEWWaitIncrease: 14,
    overallSystemEfficiency: 'Good'
  }
};
```

### 7.2 Real-Time UI Update Function

```javascript
function updateAIPanel(decision) {
  // Update Current State Section
  updateCurrentStateDisplay(decision.currentState);
  
  // Update Decision Logic Section
  displayDecisionLogic(decision.decisionLogic);
  
  // Update Active Commands Section
  displayActiveCommand(decision.decision);
  
  // Update Priority Logic Section
  if (decision.priorityCheck.emergencyDetected) {
    displayEmergencyAlert(decision);
  }
  
  // Update History Section
  appendToHistoryChart(decision.expectedOutcome);
  
  // Animate transitions
  animatePanelUpdate();
}
```

---

## 8. MULTI-INTERSECTION COORDINATION (Advanced)

For secondary intersection, use simplified logic:

### 8.1 Secondary Intersection Algorithm

```javascript
function controlSecondaryIntersection(secondary_data) {
  // Simpler logic: Direct adaptation without complex comparison
  const totalDensity = secondary_data.north_south + secondary_data.east_west;
  
  if (totalDensity < 3) {
    // Very light traffic - short cycles
    return {nsDuration: 15, ewDuration: 15};
  } else if (totalDensity < 7) {
    // Moderate - balanced
    return {nsDuration: 20, ewDuration: 20};
  } else {
    // Heavy - longer cycles
    return {nsDuration: 25, ewDuration: 25};
  }
}
```

### 8.2 Coordination Strategy

```
Main Intersection:    Complex AI (adaptive scoring)
Secondary Intersection: Simple AI (density-based)

No inter-intersection coordination in MVP
Future: Could synchronize cycles or use vehicle prediction
```

---

## 9. METRICS & PERFORMANCE TRACKING

The AI tracks various metrics to evaluate its own performance:

### 9.1 AI Performance Metrics

| Metric | Calculation | Target | Purpose |
|--------|-----------|--------|---------|
| **Avg Wait Time** | Σ(exit_time - entry_time) / vehicle_count | < 20s | User experience |
| **Throughput** | Vehicles_exiting_per_minute | > 30 | System efficiency |
| **Queue Length** | Average max queue size | < 8 vehicles | Congestion indicator |
| **Signal Efficiency** | Vehicles_served / total_green_time | > 0.5 | Light usage |
| **Congestion Index** | (Vehicles / road_capacity) × 100 | < 40% | Overall health |
| **Air Quality Index** | Emissions proxy (low speed × vehicles) | Minimize | Environmental |

### 9.2 Decision Quality Metrics

```javascript
function trackDecisionQuality(decision, outcome) {
  const decisionMetrics = {
    // Was the decision effective?
    effectivenesScore: calculateEffectiveness(decision, outcome),
    
    // How much did traffic improve?
    improvementPercent: (previousCongestion - currentCongestion) / previousCongestion,
    
    // How fair was the allocation?
    fairnessScore: calculateFairnessScore(decision),
    
    // Was emergency handled correctly?
    emergencySuccess: decision.priorityCheck.emergencyDetected 
      ? emergencyVehicle.exited
      : null,
    
    // Historical comparison
    betterThanHistoricalAverage: currentWaitTime < averageWaitTime
  };
  
  return decisionMetrics;
}
```

### 9.3 Learning & Adaptation (Optional)

```javascript
// Store decision outcomes
decisionHistory.push({
  decision: decision,
  outcome: outcome,
  quality: decisionMetrics
});

// Analyze patterns
if (decisionHistory.length > 50) {
  const patterns = analyzePatternsInHistory();
  
  // Example: "High-density N-S situations respond better to 32s green"
  // Future: Use patterns to improve future decisions
  
  // For MVP: Just track and display patterns (no actual learning)
}
```

---

## 10. ERROR HANDLING & FAIL-SAFE MODE

### 10.1 Error Detection

```javascript
function detectSystemErrors() {
  const errors = [];
  
  // Error 1: No vehicle data
  if (!hasValidVehicleData()) {
    errors.push({
      type: 'NO_SENSOR_DATA',
      severity: 'CRITICAL',
      message: 'No vehicle detection data available'
    });
  }
  
  // Error 2: Light state undefined
  if (!trafficLights.main_ns.state) {
    errors.push({
      type: 'SIGNAL_FAILURE',
      severity: 'CRITICAL'
    });
  }
  
  // Error 3: Computational failure
  try {
    makeAIDecision();
  } catch (e) {
    errors.push({
      type: 'COMPUTATION_ERROR',
      severity: 'CRITICAL',
      message: e.message
    });
  }
  
  return errors;
}
```

### 10.2 Fail-Safe Mode

```javascript
function enableFailSafeMode() {
  systemState.mode = 'FAIL_SAFE';
  
  // Switch to fixed-time signal control
  trafficLights.main_ns.state = 'green';
  trafficLights.main_ns.duration = 25; // Fixed
  trafficLights.main_ew.state = 'red';
  trafficLights.main_ew.duration = 25;
  
  // Cycle every 53 seconds (25 + 3 + 25)
  // No AI decisions made
  // Simple alternation
  
  console.warn('⚠️  AI Engine failed - Fail-safe mode activated');
  updateUIWithFailSafeStatus();
}
```

---

## 11. DECISION UPDATE FREQUENCY

```javascript
// Decision cycle timing
const AI_DECISION_INTERVAL = 2000; // milliseconds (2 seconds)
const FRAMES_PER_DECISION = 120;  // 2 seconds × 60 fps

// Decision timing relative to frame count
if (frameCount % FRAMES_PER_DECISION === 0) {
  makeAIDecision();
}

// or using timer
setInterval(makeAIDecision, AI_DECISION_INTERVAL);
```

**Rationale:** 
- 2 seconds allows light state to be established
- Quick enough to respond to changes
- Slow enough to avoid excessive recalculation

---

## 12. ALGORITHM TESTING SCENARIOS

### Test 1: Simple Imbalance
**Setup:** 10 vehicles on N-S, 2 on E-W
**Expected:** N-S gets 30-35s, E-W gets 15-20s
**Metric:** N-S wait time decreases, E-W wait time increases moderately

### Test 2: Rapid Balance Change
**Setup:** N-S: 10 → E-W: 12 (sudden shift)
**Expected:** Decision switches allocation within 2-4 seconds
**Metric:** Smooth transition, no jank, appropriate timing

### Test 3: Emergency Override
**Setup:** Normal traffic, emergency vehicle on E-W
**Expected:** E-W gets immediate green, stays 60s, switches back
**Metric:** Emergency vehicle passes, minimal delay to other traffic

### Test 4: Multi-Intersection Coordination
**Setup:** Both intersections busy simultaneously
**Expected:** Each acts independently, no conflict
**Metric:** No vehicles stuck, both clear traffic

### Test 5: Algorithm Stability
**Setup:** Run 5 minutes of normal traffic
**Expected:** Consistent decision quality, no erratic behavior
**Metric:** Average wait times stable, no dramatic swings

---

## 13. APPROVAL & SIGN-OFF

| Role | Name | Signature | Date |
|------|------|-----------|------|
| AI Lead | [Your Name] | _________ | 2026-05-07 |
| Project Lead | [Your Name] | _________ | _________ |

---

**Next Steps:**
1. Review and approve AI Engine PRD
2. Implement traffic density calculation
3. Build decision algorithm
4. Create emergency vehicle handler
5. Implement UI display functions
6. Test all scenarios
7. Optimize performance
