# Product Document

## Product Name
Offline AI Traffic Light Control Demonstration Engine

## Vision
Build an offline, interactive traffic-signal simulation that demonstrates how AI-style adaptive logic can improve intersection flow and emergency response without requiring cloud services.

## Problem Statement
Traditional fixed-time traffic signals do not react to real-time traffic density or sudden emergency priority needs. This leads to:
- unnecessary waiting time in low-priority directions
- increased congestion during peak patterns
- poor emergency vehicle throughput

The project addresses this by simulating dynamic signal timing decisions and visualizing outcomes in real time.

## Goals
- Provide a clear visual demonstration of adaptive traffic control decisions.
- Simulate North-South vs East-West congestion balancing.
- Support emergency-vehicle priority override behavior.
- Keep the system fully offline and lightweight for demo/classroom use.

## Non-Goals
- Real-world deployment to physical traffic controllers.
- Multi-intersection city-scale coordination.
- Cloud analytics, distributed telemetry, or live municipal data integration.
- Full machine-learning model training pipeline.

## Target Users
- **Primary:** Students/instructors demonstrating intelligent transport concepts.
- **Secondary:** Project evaluators and stakeholders reviewing AI-enabled traffic optimization behavior.
- **Tertiary:** Developers extending the simulator with new scenarios.

## Core Use Cases
- Start/stop/reset a traffic simulation and observe system behavior.
- Change simulation speed to inspect algorithm behavior quickly.
- Trigger emergency mode and validate priority handling.
- View decision engine outputs (density score, active command, phase duration shifts).
- Track system-level throughput and congestion indicators.

## Product Scope (Current MVP)
- Single-page web app rendered with Vite and vanilla JavaScript.
- Canvas-based map simulation using a Times Square intersection layout.
- Route-based vehicle spawning and movement across NS/EW lanes.
- Signal phase controller with green/yellow/red transitions.
- Adaptive decision logic that shifts NS/EW green durations based on computed congestion score.
- Emergency override that prioritizes the affected direction.
- Runtime dashboard showing:
  - current simulation state
  - decision logic metrics
  - active command output
  - emergency priority status
  - static 7-day trend visual

## Functional Requirements
1. **Simulation Control**
   - User can start, stop, and reset simulation.
   - User can set speed multiplier (1x/2x/5x/10x).
2. **Vehicle System**
   - Vehicles spawn probabilistically and follow configured routes.
   - Vehicles respect lane spacing constraints.
   - Vehicles stop/slow at controlled approaches based on signal state.
3. **Signal Engine**
   - System cycles NS/EW phases with yellow transition windows.
   - Phase duration is dynamically adjustable by decision logic.
4. **Decision Engine**
   - Every cycle, compute NS/EW density score using queue count, wait, and speed.
   - Select command: balanced, NS-priority, or EW-priority.
   - Apply bounded duration values for safety/stability.
5. **Emergency Handling**
   - User can inject emergency vehicle.
   - System forces priority signal state for emergency direction.
   - Override ends after emergency vehicle exits.
6. **UI/Visualization**
   - Map and moving vehicles update continuously while running.
   - Signal indicators display current NS/EW light status.
   - Dashboard updates key metrics and decisions live.

## Non-Functional Requirements
- **Offline-first:** Runs fully locally with no backend dependency.
- **Performance:** Smooth animation and UI updates on standard laptop hardware.
- **Usability:** Controls and state indicators must be understandable without code knowledge.
- **Deterministic testing support:** Seeded RNG available to help reproducibility.
- **Maintainability:** Route and signal parameters should be easy to tune in source code.

## Success Metrics
- Simulation runs without runtime errors in browser console.
- Users can complete all primary interactions (start/stop/reset/speed/emergency) successfully.
- Decision panel transitions from idle to active adaptive commands during run.
- Emergency mode visibly changes command and signal behavior.
- Build and local run commands succeed (`npm run build`, `npm run dev`).

## Risks and Constraints
- Simplified model may not represent all real-world traffic phenomena.
- Single intersection limits strategic optimization depth.
- Manual route calibration against map coordinates is sensitive to asset changes.
- Emergency logic is rule-based, not predictive.

## Future Enhancements
- Multi-intersection coordination and corridor optimization.
- Adjustable traffic demand profiles by time-of-day sliders.
- Data export (CSV/JSON) for comparative experiment reports.
- Optional backend/API for scenario persistence and analytics.
- Reinforcement-learning or optimization-based policy module.

## Release Milestones
1. **MVP (Current):** Single-intersection adaptive demo with emergency override.
2. **V1.1:** Improved analytics (wait-time charts, throughput trends over time).
3. **V1.2:** Scenario presets and configurable map/route profiles.
4. **V2.0:** Multi-intersection simulation with advanced control strategies.

## Open Questions
- Should fixed historical chart data be replaced with live computed history?
- What evaluation rubric matters most for stakeholders (throughput, wait, fairness)?
- Is deterministic scenario replay required for demo presentations?
- Should emergency mode include explicit cooldown/recovery logic after override?
