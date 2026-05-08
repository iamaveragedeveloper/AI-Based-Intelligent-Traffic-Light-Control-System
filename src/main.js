import "./style.css";

const MAP_W = 1024;
const MAP_H = 768;
const MAP_IMAGE_PATH = "/assets/map-of%20city.png?v=city-map-v1";
const CAR_IMAGE_PATH = "/assets/car-placeholder.png";
const EMERGENCY_IMAGE_PATH = "/assets/emergency-placeholder.png";
const CAR_W = 32;
const CAR_H = 20;
const STOP_BUFFER = 18;
const MIN_CAR_GAP = 32;

const canvas = document.getElementById("trafficCanvas");
const ctx = canvas.getContext("2d");

const mapImage = new Image();
let mapReady = false;
mapImage.onload = () => (mapReady = true);
mapImage.src = MAP_IMAGE_PATH;

const carImage = new Image();
let carReady = false;
carImage.onload = () => (carReady = true);
carImage.src = CAR_IMAGE_PATH;

const emergencyImage = new Image();
let emergencyReady = false;
emergencyImage.onload = () => (emergencyReady = true);
emergencyImage.src = EMERGENCY_IMAGE_PATH;

const state = {
  isRunning: false,
  speedMultiplier: 1,
  seed: Math.floor(Math.random() * 1000000),
  rng: null,
  simulationTime: 0,
  vehicles: [],
  nextVehicleId: 1,
  totalExited: 0,
  emergencyMode: false,
  emergencyVehicleId: null,
  emergencyGroup: null,
  lastDecisionAt: 0,
  decision: null,
  trafficMode: "medium",
  liveSeries: Array.from({ length: 36 }, () => 28),
  lastLiveSampleAt: 0,
  /** Next Emergency button spawn: alternates NS → EW → NS… */
  nextEmergencyGroup: "NS"
};

/** Green time (seconds) per direction for each traffic mode — immediate UI + signal behavior. */
const MODE_GREEN_SEC = { low: 3, medium: 5, high: 8 };
/** How often the Python engine refreshes phases while the sim runs (seconds). */
const MODE_AI_INTERVAL_SEC = { low: 0.35, medium: 1, high: 1.5 };
/** Desired congestion bands (%) per mode, used to steer spawn pressure. */
const MODE_CONGESTION_BAND = {
  low: { min: 15, max: 55 },
  medium: { min: 40, max: 70 },
  high: { min: 65, max: 95 }
};
/** Base per-frame spawn chance per mode before adaptive correction. */
const MODE_BASE_SPAWN_CHANCE = { low: 0.018, medium: 0.028, high: 0.042 };

const signal = {
  phase: "NS_GREEN",
  nsState: "green",
  ewState: "red",
  remaining: MODE_GREEN_SEC.medium,
  nsDuration: MODE_GREEN_SEC.medium,
  ewDuration: MODE_GREEN_SEC.medium
};

function getYellowDuration() {
  if (state.trafficMode === "low") return 1;
  if (state.trafficMode === "high") return 2;
  return 1;
}

function getCongestionPercent() {
  return Math.min(100, Math.round((state.vehicles.length / 140) * 100));
}

function getAdaptiveSpawnChance() {
  const mode = state.trafficMode;
  const band = MODE_CONGESTION_BAND[mode] ?? MODE_CONGESTION_BAND.medium;
  const base = MODE_BASE_SPAWN_CHANCE[mode] ?? MODE_BASE_SPAWN_CHANCE.medium;
  const congestion = getCongestionPercent();

  let chance = base;
  if (congestion < band.min) chance *= 1.35;
  else if (congestion > band.max) chance *= 0.45;

  if (state.emergencyMode) chance *= 0.85;
  chance *= state.speedMultiplier;
  return Math.max(0.002, Math.min(0.25, chance));
}

/** While emergency is active, cap extended green to this (seconds). Shorter than old 45s leftover. */
const EMERGENCY_GREEN_HOLD_SEC = 22;

/** After emergency vehicle despawns: snap timers back to current traffic-mode phases. */
function normalizeSignalAfterEmergencyExit() {
  applyModeTimingNow();
  void makeDecision();
}

/**
 * Drop emergency light lock once ambulance is halfway through its route,
 * so normal signal cycling resumes while it is still visible on map.
 */
function releaseEmergencyPriorityAtMidway(vehicle, route) {
  if (!state.emergencyMode) return;
  if (vehicle.id !== state.emergencyVehicleId) return;
  if (vehicle.dist < route.length * 0.5) return;

  state.emergencyMode = false;
  state.emergencyVehicleId = null;
  state.emergencyGroup = null;
  normalizeSignalAfterEmergencyExit();
}

function computeGroupStats(group) {
  const list = state.vehicles.filter((v) => {
    const r = routesById.get(v.routeId);
    return r && r.group === group;
  });
  const count = list.length;
  const avgWait = count ? list.reduce((s, v) => s + v.waitTime, 0) / count : 0;
  const avgSpeed = count ? list.reduce((s, v) => s + v.speed, 0) / count : 2.5;
  const densityScore = count * 2 + avgWait / 5 + (2.5 - avgSpeed) * 3;
  return { count, avgWait, avgSpeed, densityScore };
}

function buildLocalDecision() {
  const base = MODE_GREEN_SEC[state.trafficMode] ?? MODE_GREEN_SEC.medium;
  const y = getYellowDuration();
  const ns = computeGroupStats("NS");
  const ew = computeGroupStats("EW");
  let nsD = base;
  let ewD = base;
  const delta = state.trafficMode === "low" ? 0.9 : state.trafficMode === "medium" ? 2 : 2.5;
  let cmd = `${state.trafficMode.toUpperCase()} mode: ${base}s green / ~${y}s yellow`;

  if (state.emergencyMode) {
    cmd = `EMERGENCY PRIORITY: instant green for ${state.emergencyGroup} — all other directions red`;
  } else if (ns.densityScore > ew.densityScore + delta) {
    const bump = state.trafficMode === "low" ? 1 : 2;
    nsD = base + bump;
    ewD = Math.max(base - bump, state.trafficMode === "low" ? 2 : 3);
    cmd = "Prioritize 7th Avenue N-S";
  } else if (ew.densityScore > ns.densityScore + delta) {
    const bump = state.trafficMode === "low" ? 1 : 2;
    nsD = Math.max(base - bump, state.trafficMode === "low" ? 2 : 3);
    ewD = base + bump;
    cmd = "Prioritize 42nd/Broadway";
  }

  nsD = Math.round(nsD * 10) / 10;
  ewD = Math.round(ewD * 10) / 10;

  return {
    ns: {
      count: ns.count,
      avgWait: ns.avgWait,
      avgSpeed: ns.avgSpeed,
      densityScore: ns.densityScore
    },
    ew: {
      count: ew.count,
      avgWait: ew.avgWait,
      avgSpeed: ew.avgSpeed,
      densityScore: ew.densityScore
    },
    nsDuration: nsD,
    ewDuration: ewD,
    command: cmd
  };
}

/** Apply current mode + local priority to signal timers immediately (so button clicks always do something). */
function applyModeTimingNow() {
  if (state.emergencyMode) return;
  const d = buildLocalDecision();
  state.decision = d;
  signal.nsDuration = d.nsDuration;
  signal.ewDuration = d.ewDuration;
  if (signal.phase === "NS_GREEN") signal.remaining = signal.nsDuration;
  else if (signal.phase === "EW_GREEN") signal.remaining = signal.ewDuration;
  else if (signal.phase === "NS_YELLOW" || signal.phase === "EW_YELLOW") {
    const yCap = getYellowDuration();
    if (signal.remaining > yCap) signal.remaining = yCap;
  }
}

// Four-lane-per-arm layout:
// each arm has 2 incoming lanes + center barrier + 2 outgoing lanes.
// Routes are straight-through so vehicles cross into the correct opposite carriageway.
const routes = [
  // Vertical incoming lanes (2 from north + 2 from south), crossing through intersection.
  { id: "north_in_1", group: "NS", speed: 2.1, weight: 1.0, points: [{ x: 488, y: -40 }, { x: 488, y: 808 }] },
  { id: "north_in_2", group: "NS", speed: 2.1, weight: 1.0, points: [{ x: 506, y: -40 }, { x: 506, y: 808 }] },
  { id: "south_in_1", group: "NS", speed: 2.1, weight: 1.0, points: [{ x: 526, y: 808 }, { x: 526, y: -40 }] },
  { id: "south_in_2", group: "NS", speed: 2.1, weight: 1.0, points: [{ x: 544, y: 808 }, { x: 544, y: -40 }] },

  // Horizontal incoming lanes (2 from west + 2 from east), crossing through intersection.
  { id: "west_in_1", group: "EW", speed: 2.0, weight: 1.0, points: [{ x: -40, y: 360 }, { x: 1064, y: 360 }] },
  { id: "west_in_2", group: "EW", speed: 2.0, weight: 1.0, points: [{ x: -40, y: 378 }, { x: 1064, y: 378 }] },
  { id: "east_in_1", group: "EW", speed: 2.0, weight: 1.0, points: [{ x: 1064, y: 398 }, { x: -40, y: 398 }] },
  { id: "east_in_2", group: "EW", speed: 2.0, weight: 1.0, points: [{ x: 1064, y: 416 }, { x: -40, y: 416 }] }
];
const routesById = new Map(routes.map((r) => [r.id, r]));
const pyEngine = {
  ready: false,
  loading: false,
  busy: false
};

async function loadPyodideRuntime() {
  if (window.loadPyodide) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initPythonDecisionEngine() {
  if (pyEngine.ready || pyEngine.loading) return;
  pyEngine.loading = true;
  try {
    await loadPyodideRuntime();
    pyEngine.runtime = await window.loadPyodide();
    const modelSource = await fetch("/ai-model/traffic_decision_model.py").then((r) => r.text());
    pyEngine.runtime.runPython(modelSource);
    pyEngine.ready = true;
  } catch (error) {
    console.error("Failed to initialize python decision engine", error);
  } finally {
    pyEngine.loading = false;
  }
}

function setTrafficMode(mode) {
  state.trafficMode = ["low", "medium", "high"].includes(mode) ? mode : "medium";
  applyModeTimingNow();
  refreshTrafficModeUI();
  void makeDecision();
}

function refreshTrafficModeUI() {
  const lowBtn = document.getElementById("trafficLowBtn");
  const mediumBtn = document.getElementById("trafficMediumBtn");
  const highBtn = document.getElementById("trafficHighBtn");
  const status = document.getElementById("trafficModeStatus");
  if (!lowBtn || !mediumBtn || !highBtn || !status) return;

  lowBtn.classList.toggle("active", state.trafficMode === "low");
  mediumBtn.classList.toggle("active", state.trafficMode === "medium");
  highBtn.classList.toggle("active", state.trafficMode === "high");

  const labels = {
    low: "3s green bursts + ~1s yellow — fast rotation to clear queues",
    medium: "5s green phases + ~1s yellow",
    high: "8s green phases + ~2s yellow"
  };
  status.textContent = `Current mode: ${state.trafficMode.toUpperCase()} - ${labels[state.trafficMode]}`;
}

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
state.rng = createRng(state.seed);

function routeLength(route) {
  let total = 0;
  for (let i = 0; i < route.tracePoints.length - 1; i++) {
    const a = route.tracePoints[i];
    const b = route.tracePoints[i + 1];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function smoothPoints(points, iterations = 2) {
  if (points.length <= 2) return points.slice();
  let out = points.slice();
  for (let k = 0; k < iterations; k++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const p0 = out[i];
      const p1 = out[i + 1];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

for (const route of routes) {
  route.tracePoints = route.points.slice();
  route.length = routeLength(route);
}

function nearestCenterDistance(route) {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let traveled = 0;
  for (let i = 0; i < route.tracePoints.length - 1; i++) {
    const a = route.tracePoints[i];
    const b = route.tracePoints[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy || 1;
    const t = ((MAP_W / 2 - a.x) * dx + (MAP_H / 2 - a.y) * dy) / lenSq;
    const tc = Math.max(0, Math.min(1, t));
    const px = a.x + dx * tc;
    const py = a.y + dy * tc;
    const distToCenter = Math.hypot(px - MAP_W / 2, py - MAP_H / 2);
    if (distToCenter < bestDist) {
      bestDist = distToCenter;
      best = traveled + seg * tc;
    }
    traveled += seg;
  }
  return best;
}

function getPointOnRoute(route, dist) {
  let remaining = Math.max(0, Math.min(route.length, dist));
  for (let i = 0; i < route.tracePoints.length - 1; i++) {
    const a = route.tracePoints[i];
    const b = route.tracePoints[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: Math.atan2(b.y - a.y, b.x - a.x)
      };
    }
    remaining -= seg;
  }
  const last = route.tracePoints[route.tracePoints.length - 1];
  const prev = route.tracePoints[route.tracePoints.length - 2];
  return { x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

function pickRoute() {
  const total = routes.reduce((s, r) => s + r.weight, 0);
  let roll = state.rng() * total;
  for (const r of routes) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return routes[0];
}

/** Route for Emergency button: uses `state.nextEmergencyGroup` (NS or EW), then caller flips after success. */
function pickEmergencyRouteForAlternation() {
  const pool = routes.filter((r) => r.group === state.nextEmergencyGroup);
  if (!pool.length) return null;
  const idx = Math.floor(state.rng() * pool.length);
  return pool[idx];
}

function spawnVehicle(forceEmergency = false) {
  const route = forceEmergency ? pickEmergencyRouteForAlternation() : pickRoute();
  if (!route) return;
  const nearestOnRoute = state.vehicles
    .filter((v) => v.routeId === route.id)
    .reduce((best, v) => Math.min(best, v.dist), Number.POSITIVE_INFINITY);
  if (nearestOnRoute < MIN_CAR_GAP) return;

  const isEmergency = forceEmergency;
  const speed = isEmergency ? 2.8 : route.speed;
  const vehicle = {
    id: state.nextVehicleId++,
    routeId: route.id,
    dist: 0,
    speed,
    targetSpeed: speed,
    waitTime: 0,
    isEmergency
  };
  state.vehicles.push(vehicle);
  if (isEmergency) {
    state.emergencyMode = true;
    state.emergencyVehicleId = vehicle.id;
    state.emergencyGroup = route.group;
    applyEmergencySignalImmediate();
    state.decision = buildLocalDecision();
    void makeDecision();
    state.nextEmergencyGroup = state.nextEmergencyGroup === "NS" ? "EW" : "NS";
  }
}

function currentLight(group) {
  if (group === null) return "green";
  if (group === "NS") return signal.nsState;
  return signal.ewState;
}

/** Flip lights so the emergency vehicle's direction is green immediately (not waiting for phase timer). */
function applyEmergencySignalImmediate() {
  if (!state.emergencyMode || !state.emergencyGroup) return;
  const g = state.emergencyGroup;
  const emGreen = g === "NS" ? signal.nsState === "green" : signal.ewState === "green";
  if (emGreen) return;
  if (g === "NS") {
    signal.phase = "NS_GREEN";
    signal.nsState = "green";
    signal.ewState = "red";
  } else {
    signal.phase = "EW_GREEN";
    signal.nsState = "red";
    signal.ewState = "green";
  }
  signal.remaining = EMERGENCY_GREEN_HOLD_SEC;
}

function updateSignal(dt) {
  applyEmergencySignalImmediate();
  signal.remaining -= dt;
  if (signal.remaining > 0) return;

  if (signal.phase === "NS_GREEN") {
    signal.phase = "NS_YELLOW";
    signal.nsState = "yellow";
    signal.ewState = "red";
    signal.remaining = getYellowDuration();
  } else if (signal.phase === "NS_YELLOW") {
    signal.phase = "EW_GREEN";
    signal.nsState = "red";
    signal.ewState = "green";
    signal.remaining = signal.ewDuration;
  } else if (signal.phase === "EW_GREEN") {
    signal.phase = "EW_YELLOW";
    signal.nsState = "red";
    signal.ewState = "yellow";
    signal.remaining = getYellowDuration();
  } else {
    signal.phase = "NS_GREEN";
    signal.nsState = "green";
    signal.ewState = "red";
    signal.remaining = signal.nsDuration;
  }

  if (state.emergencyMode && state.emergencyGroup) {
    if (state.emergencyGroup === "NS") {
      signal.phase = "NS_GREEN";
      signal.nsState = "green";
      signal.ewState = "red";
    } else {
      signal.phase = "EW_GREEN";
      signal.nsState = "red";
      signal.ewState = "green";
    }
    signal.remaining = EMERGENCY_GREEN_HOLD_SEC;
  }
}

function updateVehicles(dt) {
  const routeQueues = new Map();
  for (const r of routes) routeQueues.set(r.id, []);
  for (const v of state.vehicles) routeQueues.get(v.routeId).push(v);
  for (const queue of routeQueues.values()) queue.sort((a, b) => b.dist - a.dist);

  const next = [];
  for (const v of state.vehicles) {
    const route = routesById.get(v.routeId);
    const light = currentLight(route.group);
    const stopLine = nearestCenterDistance(route) - 32;
    const shouldControl = route.group !== null;
    const approach = shouldControl && v.dist >= stopLine - 90 && v.dist <= stopLine + 30;
    const beforeStopLine = v.dist < stopLine - STOP_BUFFER;

    if (!v.isEmergency && approach) {
      // Never re-brake a vehicle that has already crossed the stop line.
      if (light === "red" && beforeStopLine) v.targetSpeed = Math.max(0, (stopLine - STOP_BUFFER - v.dist) / 22);
      else if (light === "yellow" && beforeStopLine) v.targetSpeed = Math.max(0.35, (stopLine - STOP_BUFFER - v.dist) / 26);
      else v.targetSpeed = route.speed;
    } else {
      v.targetSpeed = v.isEmergency ? 3.2 : route.speed;
    }

    const accel = v.isEmergency ? 0.12 : 0.06;
    if (v.speed < v.targetSpeed) v.speed = Math.min(v.targetSpeed, v.speed + accel);
    if (v.speed > v.targetSpeed) v.speed = Math.max(v.targetSpeed, v.speed - accel);
    if (v.speed < 0.1) v.waitTime += dt;

    const step = v.speed * state.speedMultiplier * dt * 10;
    let nextDist = v.dist + step;
    const hardStop = shouldControl && !v.isEmergency && light === "red" && beforeStopLine && nextDist >= stopLine - STOP_BUFFER;
    if (hardStop) nextDist = stopLine - STOP_BUFFER - 0.5;

    const queue = routeQueues.get(v.routeId);
    const idx = queue.findIndex((q) => q.id === v.id);
    const leader = idx > 0 ? queue[idx - 1] : null;
    if (leader) {
      const safeDist = leader.dist - MIN_CAR_GAP;
      if (nextDist > safeDist) nextDist = Math.max(v.dist, safeDist);
    }
    v.dist = Math.min(nextDist, route.length);
    releaseEmergencyPriorityAtMidway(v, route);

    if (v.dist >= route.length) {
      state.totalExited += 1;
      if (v.id === state.emergencyVehicleId) {
        state.emergencyMode = false;
        state.emergencyVehicleId = null;
        state.emergencyGroup = null;
        normalizeSignalAfterEmergencyExit();
      }
      continue;
    }
    next.push(v);
  }
  state.vehicles = next;
}

function analyze(group) {
  const source = state.decision?.[group.toLowerCase()];
  return source ?? { count: 0, avgWait: 0, avgSpeed: 2.5, densityScore: 0 };
}

async function makeDecision() {
  const local = buildLocalDecision();
  if (!pyEngine.ready) {
    state.decision = local;
    if (!state.emergencyMode) {
      signal.nsDuration = local.nsDuration;
      signal.ewDuration = local.ewDuration;
    }
    return;
  }
  if (pyEngine.busy) return;
  pyEngine.busy = true;
  try {
    const payload = {
      vehicles: state.vehicles.map((v) => ({
        route_id: v.routeId,
        wait_time: v.waitTime,
        speed: v.speed,
        is_emergency: v.isEmergency
      })),
      routes_by_id: Object.fromEntries(routes.map((r) => [r.id, { group: r.group }])),
      traffic_mode: state.trafficMode,
      emergency_mode: state.emergencyMode,
      emergency_group: state.emergencyGroup,
      signal_state: {
        ns: signal.nsState,
        ew: signal.ewState
      }
    };
    pyEngine.runtime.globals.set("payload_json", JSON.stringify(payload));
    const out = pyEngine.runtime.runPython("decide_from_json(payload_json)");
    const parsed = JSON.parse(out);
    const decision = {
      ns: {
        count: Number(parsed.ns.count),
        avgWait: Number(parsed.ns.avg_wait),
        avgSpeed: Number(parsed.ns.avg_speed),
        densityScore: Number(parsed.ns.density_score)
      },
      ew: {
        count: Number(parsed.ew.count),
        avgWait: Number(parsed.ew.avg_wait),
        avgSpeed: Number(parsed.ew.avg_speed),
        densityScore: Number(parsed.ew.density_score)
      },
      nsDuration: Number(parsed.ns_duration),
      ewDuration: Number(parsed.ew_duration),
      command: parsed.command
    };
    state.decision = decision;
    if (!state.emergencyMode) {
      signal.nsDuration = decision.nsDuration;
      signal.ewDuration = decision.ewDuration;
    }
  } catch (error) {
    console.error("Python decision call failed", error);
    state.decision = local;
    if (!state.emergencyMode) {
      signal.nsDuration = local.nsDuration;
      signal.ewDuration = local.ewDuration;
    }
  } finally {
    pyEngine.busy = false;
  }
}

function drawMap() {
  const rect = canvas.getBoundingClientRect();
  if (!mapReady) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, rect.width, rect.height);
    return;
  }
  ctx.drawImage(mapImage, 0, 0, rect.width, rect.height);
}

function mapToCanvas(p) {
  const rect = canvas.getBoundingClientRect();
  return { x: (p.x / MAP_W) * rect.width, y: (p.y / MAP_H) * rect.height };
}

function drawSignals() {
  const lights = [
    // Positioned at zebra-crossing edges for each approach.
    { p: { x: 505, y: 348 }, state: signal.nsState },
    { p: { x: 519, y: 420 }, state: signal.nsState },
    { p: { x: 468, y: 389 }, state: signal.ewState },
    { p: { x: 556, y: 379 }, state: signal.ewState }
  ];
  for (const l of lights) {
    const c = mapToCanvas(l.p);
    const bulbs = [
      { key: "red", color: "#ff3b30" },
      { key: "yellow", color: "#ffbf1a" },
      { key: "green", color: "#21d06b" }
    ];

    // Crisp 3-bulb traffic head so the active state is obvious.
    const boxW = 16;
    const boxH = 40;
    const boxX = c.x - boxW / 2;
    const boxY = c.y - boxH / 2;
    ctx.fillStyle = "#15191e";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    bulbs.forEach((b, i) => {
      const by = boxY + 8 + i * 12;
      const active = l.state === b.key;
      ctx.beginPath();
      ctx.arc(c.x, by, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = active ? b.color : "rgba(90, 96, 104, 0.55)";
      ctx.fill();
      if (active) {
        ctx.beginPath();
        ctx.arc(c.x, by, 7.2, 0, Math.PI * 2);
        ctx.fillStyle = b.key === "yellow" ? "rgba(255,191,26,0.22)" : b.key === "green" ? "rgba(33,208,107,0.22)" : "rgba(255,59,48,0.22)";
        ctx.fill();
      }
    });
  }
}

function drawVehicles(timeMs) {
  for (const v of state.vehicles) {
    const route = routesById.get(v.routeId);
    const p = getPointOnRoute(route, v.dist);
    const c = mapToCanvas({ x: p.x, y: p.y });
    if (v.isEmergency && emergencyReady) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(p.angle);
      ctx.drawImage(emergencyImage, -CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
      ctx.restore();
    } else if (v.isEmergency) {
      // Fallback if emergency sprite is unavailable.
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = "#ff1f1f";
      ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
      ctx.strokeStyle = "#ffd6d6";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
      ctx.restore();
    } else if (carReady) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(p.angle);
      ctx.drawImage(carImage, -CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
      ctx.restore();
    } else {
      ctx.fillStyle = "#d0d0d0";
      ctx.fillRect(c.x - CAR_W / 2, c.y - CAR_H / 2, CAR_W, CAR_H);
    }
    if (v.isEmergency) {
      const blink = Math.floor(timeMs / 400) % 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = blink ? "rgba(255,0,0,0.25)" : "rgba(0,140,255,0.25)";
      ctx.fill();
      ctx.fillStyle = blink ? "rgba(255,50,50,0.9)" : "rgba(0,150,255,0.9)";
      ctx.beginPath();
      ctx.arc(c.x - 5, c.y - 8, 2.6, 0, Math.PI * 2);
      ctx.arc(c.x + 5, c.y - 8, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function sampleLiveTraffic(tsMs, congestion, ns, ew) {
  const queuePressure = Math.min(100, (ns.count + ew.count) * 4.2);
  const waitPressure = Math.min(100, ((ns.avgWait + ew.avgWait) / 2) * 11);
  const imbalance = Math.min(100, Math.abs(ns.count - ew.count) * 8);
  const loadIndex = Math.round(congestion * 0.5 + waitPressure * 0.25 + queuePressure * 0.15 + imbalance * 0.1);

  if (!state.lastLiveSampleAt) state.lastLiveSampleAt = tsMs;
  const elapsed = tsMs - state.lastLiveSampleAt;
  if (elapsed >= 220) {
    state.lastLiveSampleAt = tsMs;
    state.liveSeries.push(loadIndex);
    if (state.liveSeries.length > 36) state.liveSeries.shift();
  }

  return { loadIndex, queuePressure, waitPressure, imbalance };
}

function updateUI() {
  const current = document.getElementById("currentState");
  const signalState = document.getElementById("signalState");
  const commands = document.getElementById("activeCommands");
  const priority = document.getElementById("priorityLogic");
  const chart = document.getElementById("liveChart");
  const pulseMeta = document.getElementById("livePulseMeta");
  const ns = analyze("NS");
  const ew = analyze("EW");
  const congestion = getCongestionPercent();
  const densityClass = congestion > 60 ? "high" : congestion > 30 ? "medium" : "low";
  const tsMs = performance.now();
  const pulse = sampleLiveTraffic(tsMs, congestion, ns, ew);

  current.innerHTML = `<div class="state-item"><span class="label">Seed</span><span class="value">${state.seed}</span></div>
  <div class="state-item"><span class="label">Vehicles Active</span><span class="value">${state.vehicles.length}</span></div>
  <div class="state-item"><span class="label">Throughput</span><span class="value">${state.totalExited}</span></div>
  <div class="state-item"><span class="label">System Congestion</span><span class="badge density-${densityClass}">${densityClass}</span></div>`;

  signalState.innerHTML = `<div class="state-item"><span class="label">N-S Signal</span><span class="value">${signal.nsState.toUpperCase()}</span></div>
  <div class="state-item"><span class="label">E-W Signal</span><span class="value">${signal.ewState.toUpperCase()}</span></div>
  <div class="state-item"><span class="label">Phase Remaining</span><span class="value">${Math.max(0, signal.remaining).toFixed(1)}s</span></div>`;

  const d = state.decision;
  commands.innerHTML = d
    ? `<div class="command-box"><strong>${d.command}</strong><br>NS: ${d.nsDuration}s | EW: ${d.ewDuration}s</div>
       <div class="state-item"><span class="label">N-S Score</span><span class="value">${d.ns.densityScore.toFixed(1)}</span></div>
       <div class="state-item"><span class="label">E-W Score</span><span class="value">${d.ew.densityScore.toFixed(1)}</span></div>`
    : "<p class='label'>No active command yet.</p>";
  priority.innerHTML = state.emergencyMode
    ? `<div class="alert-box"><strong>Emergency Active</strong><br>Priority group: ${state.emergencyGroup}</div>`
    : "<p class='label'>No emergency vehicle detected.</p>";

  const latest = state.liveSeries[state.liveSeries.length - 1] ?? 0;
  const prev = state.liveSeries[state.liveSeries.length - 2] ?? latest;
  const trend = latest > prev + 1 ? "rising" : latest < prev - 1 ? "falling" : "stable";
  pulseMeta.textContent = `Load ${latest}/100 (${trend}) - Congestion ${congestion}%, Wait ${Math.round(
    pulse.waitPressure
  )}%, Queue ${Math.round(pulse.queuePressure)}%, Imbalance ${Math.round(pulse.imbalance)}%`;

  if (!chart.childElementCount || chart.childElementCount !== state.liveSeries.length) {
    chart.innerHTML = "";
    state.liveSeries.forEach(() => {
      const b = document.createElement("div");
      b.className = "bar";
      chart.appendChild(b);
    });
  }
  Array.from(chart.children).forEach((bar, idx) => {
    const v = state.liveSeries[idx];
    bar.style.height = `${v}%`;
    bar.classList.toggle("low", v < 40);
    bar.classList.toggle("hot", v > 74);
  });
}

let previousTs = 0;
function loop(ts) {
  if (!previousTs) previousTs = ts;
  const dt = (ts - previousTs) / 1000;
  previousTs = ts;
  if (state.isRunning) {
    state.simulationTime += dt * state.speedMultiplier;
    if (state.rng() < getAdaptiveSpawnChance()) spawnVehicle(false);
    updateSignal(dt);
    updateVehicles(dt);
    const aiEvery = MODE_AI_INTERVAL_SEC[state.trafficMode] ?? 1;
    if (state.simulationTime - state.lastDecisionAt >= aiEvery) {
      void makeDecision();
      state.lastDecisionAt = state.simulationTime;
    }
  }
  drawMap();
  drawVehicles(ts);
  // Keep lights as top overlay so they remain visible over traffic.
  drawSignals();
  updateUI();
  requestAnimationFrame(loop);
}

function initSpeedDropdown() {
  const root = document.getElementById("speedDropdown");
  const trigger = document.getElementById("speedDropdownBtn");
  const options = Array.from(document.querySelectorAll(".speed-option"));
  if (!root || !trigger || !options.length) return;

  const setSpeed = (value) => {
    state.speedMultiplier = value;
    trigger.textContent = `Speed: ${value}x`;
    options.forEach((opt) => opt.classList.toggle("active", Number(opt.dataset.speed) === value));
  };

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = root.classList.toggle("open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      const value = Number(opt.dataset.speed);
      if (!Number.isFinite(value)) return;
      setSpeed(value);
      root.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) {
      root.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

document.getElementById("startBtn").addEventListener("click", () => (state.isRunning = true));
document.getElementById("stopBtn").addEventListener("click", () => (state.isRunning = false));
document.getElementById("resetBtn").addEventListener("click", () => {
  state.isRunning = false;
  state.vehicles = [];
  state.totalExited = 0;
  state.simulationTime = 0;
  state.lastDecisionAt = 0;
  state.decision = null;
  state.seed = Math.floor(Math.random() * 1000000);
  state.rng = createRng(state.seed);
  state.liveSeries = Array.from({ length: 36 }, () => 28);
  state.lastLiveSampleAt = 0;
  state.emergencyMode = false;
  state.emergencyVehicleId = null;
  state.emergencyGroup = null;
  state.nextEmergencyGroup = "NS";
  signal.phase = "NS_GREEN";
  signal.nsState = "green";
  signal.ewState = "red";
  applyModeTimingNow();
});
document.getElementById("emergencyBtn").addEventListener("click", () => spawnVehicle(true));
document.getElementById("trafficLowBtn").addEventListener("click", () => setTrafficMode("low"));
document.getElementById("trafficMediumBtn").addEventListener("click", () => setTrafficMode("medium"));
document.getElementById("trafficHighBtn").addEventListener("click", () => setTrafficMode("high"));

window.addEventListener("resize", () => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
});
window.dispatchEvent(new Event("resize"));
applyModeTimingNow();
refreshTrafficModeUI();
initSpeedDropdown();
initPythonDecisionEngine().then(() => makeDecision());
requestAnimationFrame(loop);
