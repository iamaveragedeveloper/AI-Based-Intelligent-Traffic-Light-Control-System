# Standalone Traffic AI Model

This folder contains the standalone Python traffic-light decision model used by the app as the decision engine.

## Files

- `traffic_decision_model.py`: Python decision model (standalone presentation version and runtime engine).

## What it does

Traffic modes map to **green-phase windows** (seconds per direction, before yellow):

- **low:** 3s green (short bursts; pairs with ~1s yellow in the app)
- **medium:** 5s green (~1s yellow in the app)
- **high:** 8s green (~2s yellow in the app)

Given lane-level vehicle state and route-group metadata (`NS` / `EW`), the model:

1. Computes per-group metrics:
   - vehicle count
   - average wait time
   - average speed
   - density score
2. Chooses signal durations (`nsDuration`, `ewDuration`)
3. Emits a human-readable command string
4. Supports emergency override mode
5. In `low` mode, applies queue relief:
   - if the currently red direction has more than 3 queued vehicles, it gets a short priority release window

## Python API

```python
from traffic_decision_model import TrafficDecisionModel, VehicleState, RouteMeta

model = TrafficDecisionModel()
routes_by_id = {
    "north_in_1": RouteMeta(group="NS"),
    "west_in_1": RouteMeta(group="EW"),
}
vehicles = [
    VehicleState(route_id="north_in_1", wait_time=3.5, speed=1.4),
    VehicleState(route_id="west_in_1", wait_time=8.1, speed=0.9),
]

decision = model.decide(
    vehicles=vehicles,
    routes_by_id=routes_by_id,
    traffic_mode="medium",
    emergency_mode=False,
    emergency_group=None,
    signal_state={"ns": "green", "ew": "red"},
)
print(decision)
```

JSON helper APIs for runtime integration:

```python
from traffic_decision_model import decide_from_payload, decide_from_json

decision = decide_from_payload(payload_dict)
decision_json = decide_from_json(payload_json)
```

Run demo directly:

```bash
python ai-model/traffic_decision_model.py
```

## Standalone presentation note

The model has no DOM/canvas dependencies and can be run directly in Python or embedded into frontend/backend runtimes (the app runs this Python model in-browser via Pyodide).
