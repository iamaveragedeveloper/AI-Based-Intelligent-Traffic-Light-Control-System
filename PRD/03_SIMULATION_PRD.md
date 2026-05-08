# SIMULATION PRD: Traffic Simulation Engine Specifications

**Project Name:** Offline AI Traffic Light Control Demonstration Engine  
**Document Type:** Simulation Product Requirements Document  
**Version:** 1.0  
**Date:** 2026-05-07  

---

## 1. SIMULATION OVERVIEW

The simulation engine creates a realistic traffic environment where vehicles move according to traffic rules, respond to traffic lights, and interact with the traffic control system. The simulation must feel alive, unpredictable, and representative of real urban traffic patterns.

### Core Objective
Simulate realistic urban traffic at multiple intersections in NYC-style road network that responds intelligently to vehicle density and prioritizes emergency vehicles.

---

## 2. ROAD NETWORK DESIGN

### NYC-Inspired Road Layout

The prototype should simulate a realistic NYC intersection network with multiple intersections and road segments.

#### Road Configuration

**Primary Roads (Major thoroughfares):**

1. **Top Horizontal Road**
   - Direction: Left to Right
   - Lanes: 3 lanes
   - Length: Extends across 80% of canvas width
   - Speed Limit: 2.5 units/frame (normal)
   - Purpose: Main east-west thoroughfare

2. **Bottom Horizontal Road**
   - Direction: Left to Right
   - Lanes: 3 lanes
   - Length: Extends across 80% of canvas width
   - Speed Limit: 2.5 units/frame
   - Purpose: Main east-west thoroughfare (opposite direction)

3. **Left Vertical Road**
   - Direction: Top to Bottom
   - Lanes: 3 lanes
   - Length: Extends across 80% of canvas height
   - Speed Limit: 2.5 units/frame
   - Purpose: Main north-south thoroughfare

4. **Right Vertical Road**
   - Direction: Top to Bottom
   - Lanes: 3 lanes
   - Length: Extends across 80% of canvas height
   - Speed Limit: 2.5 units/frame
   - Purpose: Main north-south thoroughfare (opposite direction)

**Secondary Roads (Local streets):**

5. **Mid-Top Horizontal Road**
   - Direction: Left to Right
   - Lanes: 2 lanes
   - Length: 60% of canvas width
   - Speed Limit: 2.0 units/frame
   - Purpose: Secondary east-west thoroughfare

6. **Mid-Left Vertical Road**
   - Direction: Top to Bottom
   - Lanes: 2 lanes
   - Length: 60% of canvas height
   - Speed Limit: 2.0 units/frame
   - Purpose: Secondary north-south thoroughfare

#### Intersection Points

**Main Intersection:**
- Location: Center of map (where primary roads cross)
- Road segments: Top, Bottom, Left, Right
- Traffic light control: Synchronized N-S and E-W signals
- Pedestrian crossing: All 4 approaches

**Secondary Intersection:**
- Location: Upper-left area (where secondary roads cross)
- Road segments: Mid-Top, Mid-Left
- Traffic light control: Independent N-S and E-W signals

---

## 3. VEHICLE DYNAMICS

### Vehicle Types

#### Normal Vehicles
- **Representation:** Grey color (#d0d0d0)
- **Size:** 16px × 10px (horizontal orientation on horizontal roads)
- **Base Speed:** 2.0 - 2.5 units/frame
- **Acceleration:** 0.05 units/frame²
- **Deceleration:** 0.05 - 0.1 units/frame²
- **Max Speed:** 2.5 units/frame
- **Min Speed:** 0 units/frame (full stop)
- **Distribution:** 85% of all vehicles

#### Emergency Vehicles
- **Representation:** Orange-red color (#ff6432)
- **Size:** 16px × 10px (same as normal vehicles)
- **Base Speed:** 2.5 units/frame
- **Acceleration:** 0.1 units/frame² (faster acceleration)
- **Deceleration:** 0.05 units/frame² (no normal braking, only emergency)
- **Max Speed:** 3.0 units/frame
- **Min Speed:** 0 units/frame
- **Distribution:** 1-2% of vehicles (triggered manually or at random intervals)
- **Identifier:** Animated red and blue sirens on top

### Vehicle Behavior Model

#### 1. **Movement Along Road**
```
new_position = current_position + speed * simulation_speed_multiplier * delta_time

Where:
- current_position: Pixel offset along the road
- speed: Current velocity of vehicle (0 - 2.5 units/frame)
- simulation_speed_multiplier: 1x, 2x, 5x, or 10x
- delta_time: Frame duration (assumed 16.67ms @ 60fps)
```

#### 2. **Speed Adjustment Based on Traffic Light**

**State: RED LIGHT**
- Deceleration: 0.05 units/frame per frame
- Target speed: 0 (come to complete stop)
- Behavior: Gradually slow down and stop before intersection

```javascript
if (trafficLight.state === 'RED') {
  targetSpeed = 0;
  currentSpeed -= 0.05;
} else if (trafficLight.state === 'YELLOW') {
  targetSpeed = 0.5; // Cautious approach
  currentSpeed -= 0.02;
} else if (trafficLight.state === 'GREEN') {
  targetSpeed = 2.5; // Accelerate
  currentSpeed += 0.05;
}
```

**State: YELLOW LIGHT**
- Deceleration: 0.02 units/frame (mild)
- Target speed: 0.5 (slow approach)
- Behavior: Begin slowing down cautiously

**State: GREEN LIGHT**
- Acceleration: 0.05 units/frame
- Target speed: 2.5 (max speed)
- Behavior: Accelerate smoothly to max speed

**Emergency Vehicles:**
- Ignore red/yellow lights
- Always accelerate at 0.1 units/frame until max speed
- Priority override on all signals

#### 3. **Intersection Navigation**

When a vehicle reaches an intersection:
1. Check lane position and turn direction
2. If turning required: Adjust position smoothly
3. If proceeding straight: Continue on new road segment
4. If traffic light is red: Stop and wait
5. If traffic light is green: Proceed or turn

**Turn Mechanics (Optional for MVP):**
- Simple lane-change logic
- Smooth curve through intersection (can be linear for simplicity)
- Coordinate updates to reflect new road direction

#### 4. **Lane Assignment**

Each vehicle is assigned a lane (0, 1, or 2) when spawned:
```javascript
vehicleLane = Math.floor(Math.random() * numLanes);
// For 3-lane road: vehicleLane = 0, 1, or 2
// For 2-lane road: vehicleLane = 0 or 1
```

**Lane Offset:**
- Horizontal roads: y_position = road_start_y + (lane_index * lane_spacing) + 10px
- Vertical roads: x_position = road_start_x + (lane_index * lane_spacing) + 10px
- Lane spacing: ~20px per lane

#### 5. **Collision Avoidance (Simplified)**

For MVP, simplified collision model:
- Vehicles do not collide with each other
- Vehicles stop at traffic lights (prevent overlap)
- Vehicles that pass each other at same speed maintain distance

**Optional Enhancement:**
- Advanced collision detection with buffer zones
- Vehicle following model (maintain distance to vehicle ahead)
- Realistic stop-and-go waves

---

## 4. VEHICLE GENERATION & SPAWN PATTERNS

### Spawn Mechanics

**Entry Points:**
- Off-screen starting positions for each road
- Vehicles spawn at road entry point (-50px offset)
- Vehicle spawns at random lane on road

**Spawn Rate:**
- Base spawn rate: 1-3 vehicles per 2 seconds (on each road)
- Variable spawn rate: Increases during peak hours
- Randomized: ±0.5 second variance to avoid perfect patterns

**Spawn Distribution:**
```javascript
// Pseudo-code for spawn logic
if (frameCount % spawnIntervalFrames === 0) {
  if (Math.random() < spawnProbability) {
    newVehicle = createVehicle(roadId, randomLane);
    addToSimulation(newVehicle);
  }
}

// Spawn intervals vary:
// Peak hours: 50 frames (~0.8s between spawns)
// Normal: 100 frames (~1.6s between spawns)
// Off-peak: 200 frames (~3.2s between spawns)
```

**Randomization (Random Seed):**
- Use a seeded random number generator for reproducibility
- Different seed = different traffic pattern
- Seed resets on "Reset Simulation" button
- Random seed generated on "Start Simulation" if not specified

### Vehicle Lifecycle

1. **Creation:** Spawn at entry point, assign lane, set initial speed
2. **Movement:** Update position each frame based on traffic light state
3. **Intersection Navigation:** Handle lane changes or turns
4. **Exit:** When position exceeds road length, remove vehicle from simulation
5. **Destruction:** Free memory, decrement vehicle counter

**Exit Condition:**
```javascript
if (vehicle.position > roadLength + 50) {
  removeVehicle(vehicle);
  // Clean up memory
}
```

---

## 5. TRAFFIC RULES & COMPLIANCE

### Rule 1: Stop at Red Lights
- **Requirement:** Vehicles must come to complete stop before intersection
- **Implementation:** Set speed to 0 when light is red and vehicle is approaching
- **Distance Check:** Begin stopping 30-40px before intersection
- **Verification:** Speed should be 0 while light remains red

### Rule 2: Proceed on Green Lights
- **Requirement:** Vehicles accelerate and pass through intersection
- **Implementation:** Accelerate to max speed when light is green
- **Distance Check:** No restriction on movement
- **Verification:** Vehicles smoothly enter intersection and exit

### Rule 3: Caution on Yellow Lights
- **Requirement:** Vehicles slow down when approaching yellow light
- **Implementation:** Gradual deceleration at 0.02 units/frame²
- **Distance Check:** If vehicle is far from intersection, can stop safely
- **Distance Check:** If vehicle is close, can proceed cautiously
- **Verification:** Not all vehicles stop; some pass through (realistic)

### Rule 4: Yield to Pedestrians (Future Enhancement)
- Not required for MVP
- Future: Detect pedestrian crossing signals and adjust vehicle behavior

### Rule 5: Emergency Vehicle Override
- **Requirement:** Emergency vehicles pass through regardless of light state
- **Implementation:** Skip all traffic light checks for emergency vehicles
- **Priority:** Highest priority (over all other rules)
- **Verification:** Emergency vehicles never stop at red lights

### Compliance Monitoring (Optional)
- Track rule violations for statistics
- Log instances where vehicles run red lights (should be rare)
- Report compliance percentage to AI panel

---

## 6. TRAFFIC LIGHT CYCLE MANAGEMENT

### Light States
- **RED:** Stop (duration: varies, 15-35 seconds)
- **YELLOW:** Caution (duration: fixed 3 seconds)
- **GREEN:** Go (duration: varies, 15-35 seconds)

### Light Cycle Sequence
```
GREEN (N-S) → YELLOW (3s) → RED (N-S) → GREEN (E-W) → YELLOW (3s) → RED (E-W) → repeat
```

### Duration Calculation
- **Minimum Duration:** 15 seconds
- **Maximum Duration:** 35 seconds
- **Default Duration:** 25 seconds

Duration is determined by:
1. Traffic density (vehicle count per direction)
2. Average wait time in queue
3. Emergency vehicle presence

### Timing Logic
```javascript
// Pseudo-code
if (northSouthDensity > eastWestDensity + 2) {
  nsDuration = 30; // More time for congested direction
  ewDuration = 20; // Less time for clear direction
} else if (eastWestDensity > northSouthDensity + 2) {
  nsDuration = 20;
  ewDuration = 30;
} else {
  nsDuration = 25; // Balanced
  ewDuration = 25;
}
```

### Yellow Light Logic
- When transitioning from GREEN to RED: YELLOW for 3 seconds
- Vehicles in yellow state apply cautious braking
- After 3 seconds, automatically switch to RED

---

## 7. ENVIRONMENTAL & PERFORMANCE PARAMETERS

### Canvas Rendering
- **Rendering Rate:** 60 FPS (16.67ms per frame)
- **Update Frequency:** Every frame
- **Optimization:** Only redraw changed elements or full canvas redraw per frame

### Simulation Time
- **Real Time:** Actual wall-clock time
- **Simulation Time:** Real time × speed multiplier
  - 1x = 1 second simulation = 1 second real time
  - 2x = 2 seconds simulation = 1 second real time
  - 5x = 5 seconds simulation = 1 second real time
  - 10x = 10 seconds simulation = 1 second real time

### Memory Management
- **Maximum Vehicles on Screen:** 100-200 (depends on spawn rate and cycle time)
- **Vehicle Object Structure:**
  ```javascript
  {
    id: number,
    roadId: string,
    laneIndex: number,
    position: number, // px along road
    speed: number, // units/frame
    isEmergency: boolean,
    spawnTime: number // for age tracking
  }
  ```
- **Memory per Vehicle:** ~200 bytes
- **Total Simulation Memory:** ~40KB (200 vehicles)

### Performance Targets
- **Frame Rate:** Consistent 60 FPS (no drops)
- **Initial Load Time:** < 1 second
- **Simulation Update Time:** < 5ms per frame
- **Rendering Time:** < 10ms per frame
- **Total Frame Time:** < 16.67ms (16.67ms = 1 frame @ 60fps)

---

## 8. SPECIAL SCENARIOS

### Scenario 1: Rush Hour Traffic
**Trigger:** Certain times of day (7-9am, 5-7pm) in 7-day history
**Behavior:**
- Increased spawn rate (3-4 vehicles per second)
- Longer queue buildup
- Traffic lights need to adapt more dynamically
- Average vehicle count: 80-100 on screen

### Scenario 2: Light Traffic
**Trigger:** Off-peak hours (10pm-6am) in 7-day history
**Behavior:**
- Lower spawn rate (0.5-1 vehicle per second)
- Quick intersection clearance
- Shorter light cycles
- Average vehicle count: 10-20 on screen

### Scenario 3: Emergency Vehicle
**Trigger:** User clicks "Emergency Vehicle" button OR random events
**Behavior:**
- Spawns a red emergency vehicle
- Vehicle ignores all traffic lights
- Traffic lights prioritize emergency vehicle lane
- Other vehicles defer to emergency vehicle
- Duration: Until vehicle exits intersection
- Visual: Animated red/blue sirens on vehicle

### Scenario 4: Accident/Congestion
**Trigger:** Cluster of vehicles waiting at red light (optional)
**Behavior:**
- Vehicles queue up visibly
- Traffic density increases
- AI extends signal duration to clear queue
- Demonstration of adaptive signal control

---

## 9. DATA TRACKING & METRICS

### Per-Vehicle Metrics
- **Vehicle ID:** Unique identifier
- **Spawn Time:** When vehicle was created
- **Exit Time:** When vehicle left simulation
- **Total Wait Time:** Time spent at red lights
- **Distance Traveled:** Total pixels traveled
- **Average Speed:** Total distance / total time
- **Rules Violated:** Count of rule violations (if tracking)

### Per-Intersection Metrics
- **Vehicle Count:** Current vehicles in intersection
- **Average Wait Time:** Mean of all vehicle wait times
- **Throughput:** Vehicles exiting per minute
- **Density Classification:** Low/Medium/High
- **Light Cycle Duration:** Current and historical

### Per-Road Metrics
- **Queue Length:** Number of vehicles waiting
- **Traffic Density:** Percentage of road occupied
- **Average Speed:** Mean vehicle speed on road
- **Flow Rate:** Vehicles per minute passing point

### Aggregated Metrics
- **Total Vehicles Processed:** All vehicles that exited
- **Average Trip Time:** Mean vehicle travel time
- **System Efficiency:** Vehicles processed per hour
- **Peak Hour Volume:** Max vehicle count seen
- **Congestion Index:** Overall system congestion level

---

## 10. RANDOMIZATION & SEEDING

### Random Seed Implementation

**Purpose:** Ensure reproducible simulations while allowing variety

**Seeded Random Number Generator:**
```javascript
// Simple seeded RNG (Mulberry32)
function seededRandom(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Usage:
let rng = seededRandom(seed);
vehicleSpawnRate = 1 + rng() * 2; // Random between 1-3
```

### Seed Generation
- **On Start:** Generate random seed if not provided
- **On Reset:** Use new random seed (different traffic each time)
- **Display Seed:** Optional: Show seed in UI for reproducibility

### Randomized Parameters
- Vehicle spawn intervals (±0.5s variance)
- Vehicle lane assignments (random 0-2)
- Vehicle initial speed (2.0-2.5 units/frame)
- Acceleration variation (±0.01)
- Emergency vehicle frequency (random timing)

---

## 11. VALIDATION & TESTING SCENARIOS

### Test Scenario 1: Basic Traffic Flow
- Spawn vehicles on all roads
- Green light cycles every 25 seconds
- Verify vehicles move smoothly
- Verify no vehicles overlap
- Verify vehicles stop at red lights

**Expected Result:** Smooth, realistic traffic flow

### Test Scenario 2: High-Density Rush Hour
- Increase spawn rate to 3 vehicles/second
- Run for 2 minutes (simulation time)
- Verify traffic density increases
- Verify AI extends signal duration
- Verify traffic clears after longer green light

**Expected Result:** Vehicles accumulate, AI adapts, traffic flows

### Test Scenario 3: Emergency Vehicle Override
- Run normal simulation
- Trigger emergency vehicle on North road
- Verify red light turns green immediately
- Verify emergency vehicle passes through
- Verify normal traffic stops
- Verify normal operation resumes after

**Expected Result:** Emergency vehicle gets priority, traffic pauses

### Test Scenario 4: Multiple Intersections
- Spawn vehicles on secondary roads
- Verify secondary intersection has independent signals
- Verify vehicles navigate intersections correctly
- No vehicles teleporting or disappearing

**Expected Result:** Multiple intersections operate independently

### Test Scenario 5: Speed Multiplier
- Start simulation at 1x speed
- Change to 5x speed mid-simulation
- Verify frame update rate remains smooth
- Verify vehicles move 5x faster
- Change back to 1x speed
- Verify smooth transition

**Expected Result:** Speed changes smoothly, no jank

### Test Scenario 6: Random Seed Reproducibility
- Start simulation with seed = 12345
- Record all vehicle positions at t=30s
- Stop simulation, reset
- Start again with seed = 12345
- Verify identical vehicle pattern at t=30s

**Expected Result:** Identical patterns confirm seeding works

### Test Scenario 7: Long-Duration Stability
- Run simulation for 10 minutes (simulation time)
- Monitor memory usage (should remain constant)
- Monitor frame rate (should remain 60fps)
- Verify no memory leaks
- Verify no visual glitches

**Expected Result:** Stable performance over time

---

## 12. SIMULATION PARAMETERS (CONFIGURABLE)

```javascript
// Simulation Configuration Object
const simulationConfig = {
  // Road Configuration
  roads: [...], // Array of road objects
  intersections: [...], // Array of intersection objects
  
  // Vehicle Behavior
  maxVehicleSpeed: 2.5,
  minVehicleSpeed: 0,
  accelerationRate: 0.05,
  decelerationRate: 0.05,
  emergencyAcceleration: 0.1,
  
  // Spawn Parameters
  baseSpawnRate: 1.5, // vehicles per second
  peakSpawnRate: 3.5,
  offPeakSpawnRate: 0.5,
  emergencySpawnChance: 0.001, // per frame
  
  // Light Configuration
  minLightDuration: 15,
  maxLightDuration: 35,
  yellowLightDuration: 3,
  
  // Simulation Control
  targetFrameRate: 60,
  defaultSpeedMultiplier: 1,
  
  // Random Seed
  seed: null, // null = generate random
  useSeededRandom: true
};
```

---

## 13. PERFORMANCE OPTIMIZATION TIPS

1. **Use OffscreenCanvas** (if browser support) for rendering
2. **Batch vehicle updates** in loop (don't update individually)
3. **Cull off-screen vehicles** immediately (don't render)
4. **Use requestAnimationFrame** for smooth rendering
5. **Minimize canvas redraw** by clearing efficiently
6. **Use typed arrays** (Float32Array) for vehicle data
7. **Avoid object creation in update loops** (pre-allocate)
8. **Use bitwise operations** for integer math where possible
9. **Cache frequently accessed values** (road dimensions, intersection positions)
10. **Profile with DevTools** regularly

---

## 14. DEBUGGING & LOGGING

### Debug Information to Track
- Current FPS
- Vehicle count on screen
- Memory usage
- Average frame time
- Spawn rate (vehicles/second)
- Traffic density per road
- Light states and remaining duration

### Debug Display (Optional)
- FPS counter in corner
- Vehicle count badge
- Light state indicator
- Memory usage warning
- Spawn rate indicator

### Console Logging
```javascript
// Log major events
console.log(`[${timestamp}] Spawned vehicle #${id} on road ${roadId}`);
console.log(`[${timestamp}] Vehicle #${id} exited simulation`);
console.log(`[${timestamp}] Emergency vehicle activated on ${roadId}`);
console.log(`[${timestamp}] Light changed: ${direction} = ${state}`);
```

---

## 15. APPROVAL & SIGN-OFF

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Simulation Lead | [Your Name] | _________ | 2026-05-07 |
| Project Lead | [Your Name] | _________ | _________ |

---

**Next Steps:**
1. Review and approve Simulation PRD
2. Implement vehicle spawning logic
3. Build traffic light state machine
4. Create vehicle movement physics
5. Integrate with map rendering
6. Test all scenarios
7. Optimize performance
