import json
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class VehicleState:
    route_id: str
    wait_time: float
    speed: float
    is_emergency: bool = False


@dataclass
class RouteMeta:
    group: Optional[str]  # "NS", "EW", or None


class TrafficDecisionModel:
    """
    Standalone traffic signal decision model.
    Can be presented and run independently from the UI.
    """

    def __init__(self) -> None:
        self.mode_profiles = {
            "low": {
                "min_phase": 2,
                "max_phase": 4,
                "base_phase": 3,
                "priority_delta": 0.9,
                "priority_boost": 1,
                "priority_cut": 1,
                "label": "Low traffic mode: 3s green bursts (fast clearing)",
            },
            "medium": {
                "min_phase": 4,
                "max_phase": 8,
                "base_phase": 5,
                "priority_delta": 2.0,
                "priority_boost": 2,
                "priority_cut": 2,
                "label": "Medium traffic mode: 5s green phases",
            },
            "high": {
                "min_phase": 6,
                "max_phase": 12,
                "base_phase": 8,
                "priority_delta": 2.5,
                "priority_boost": 2,
                "priority_cut": 2,
                "label": "High traffic mode: 8s green phases",
            },
        }
        self.set_traffic_mode("medium")

    def set_traffic_mode(self, mode: str) -> None:
        selected = mode if mode in self.mode_profiles else "medium"
        self.traffic_mode = selected
        profile = self.mode_profiles[selected]
        self.min_phase = profile["min_phase"]
        self.max_phase = profile["max_phase"]
        self.base_phase = profile["base_phase"]
        self.priority_delta = profile["priority_delta"]
        self.priority_boost = profile["priority_boost"]
        self.priority_cut = profile["priority_cut"]

    def get_traffic_mode_meta(self) -> Dict[str, str]:
        profile = self.mode_profiles[self.traffic_mode]
        return {"mode": self.traffic_mode, "label": profile["label"]}

    @staticmethod
    def _analyze_group(
        vehicles: List[VehicleState],
        routes_by_id: Dict[str, RouteMeta],
        group: str,
    ) -> Dict[str, float]:
        group_vehicles = [v for v in vehicles if routes_by_id.get(v.route_id) and routes_by_id[v.route_id].group == group]
        count = len(group_vehicles)
        avg_wait = sum(v.wait_time for v in group_vehicles) / count if count else 0.0
        avg_speed = sum(v.speed for v in group_vehicles) / count if count else 2.5
        density_score = count * 2 + avg_wait / 5 + (2.5 - avg_speed) * 3
        return {
            "count": float(count),
            "avg_wait": avg_wait,
            "avg_speed": avg_speed,
            "density_score": density_score,
        }

    def decide(
        self,
        vehicles: List[VehicleState],
        routes_by_id: Dict[str, RouteMeta],
        traffic_mode: str = "medium",
        emergency_mode: bool = False,
        emergency_group: Optional[str] = None,
        signal_state: Optional[Dict[str, str]] = None,
    ) -> Dict[str, object]:
        self.set_traffic_mode(traffic_mode)
        ns = self._analyze_group(vehicles, routes_by_id, "NS")
        ew = self._analyze_group(vehicles, routes_by_id, "EW")

        ns_duration = self.base_phase
        ew_duration = self.base_phase
        command = "Balanced signal allocation"

        if not emergency_mode:
            if ns["density_score"] > ew["density_score"] + self.priority_delta:
                ns_duration = self.base_phase + self.priority_boost
                ew_duration = self.base_phase - self.priority_cut
                command = "Prioritize 7th Avenue N-S"
            elif ew["density_score"] > ns["density_score"] + self.priority_delta:
                ns_duration = self.base_phase - self.priority_cut
                ew_duration = self.base_phase + self.priority_boost
                command = "Prioritize 42nd/Broadway"

            # Low-mode queue relief:
            # If the red side has >3 queued cars, give it a short immediate priority burst.
            if self.traffic_mode == "low" and signal_state:
                ns_light = signal_state.get("ns")
                ew_light = signal_state.get("ew")
                red_group: Optional[str] = None
                if ns_light == "red":
                    red_group = "NS"
                elif ew_light == "red":
                    red_group = "EW"

                if red_group:
                    red_queue_count = 0
                    for v in vehicles:
                        route_meta = routes_by_id.get(v.route_id)
                        if not route_meta or route_meta.group != red_group:
                            continue
                        # Treat slow/queued vehicles as rows waiting at red.
                        if v.speed <= 0.35 or v.wait_time >= 0.5:
                            red_queue_count += 1

                    if red_queue_count > 3:
                        if red_group == "NS":
                            ns_duration = 2
                            ew_duration = 1
                            command = "Low-mode queue relief: release NS red queue"
                        else:
                            ns_duration = 1
                            ew_duration = 2
                            command = "Low-mode queue relief: release EW red queue"
        else:
            command = f"Emergency override active ({emergency_group})"

        ns_duration = max(self.min_phase, min(self.max_phase, ns_duration))
        ew_duration = max(self.min_phase, min(self.max_phase, ew_duration))

        return {
            "ns": ns,
            "ew": ew,
            "ns_duration": ns_duration,
            "ew_duration": ew_duration,
            "command": command,
            "traffic_mode": self.traffic_mode,
            "traffic_mode_meta": self.get_traffic_mode_meta(),
        }


def _vehicle_from_dict(item: Dict[str, object]) -> VehicleState:
    return VehicleState(
        route_id=str(item.get("route_id", "")),
        wait_time=float(item.get("wait_time", 0.0)),
        speed=float(item.get("speed", 0.0)),
        is_emergency=bool(item.get("is_emergency", False)),
    )


def _routes_from_dict(raw: Dict[str, Dict[str, object]]) -> Dict[str, RouteMeta]:
    return {route_id: RouteMeta(group=meta.get("group")) for route_id, meta in raw.items()}


def decide_from_payload(payload: Dict[str, object]) -> Dict[str, object]:
    model = TrafficDecisionModel()
    vehicles = [_vehicle_from_dict(v) for v in payload.get("vehicles", [])]
    routes_by_id = _routes_from_dict(payload.get("routes_by_id", {}))
    decision = model.decide(
        vehicles=vehicles,
        routes_by_id=routes_by_id,
        traffic_mode=str(payload.get("traffic_mode", "medium")),
        emergency_mode=bool(payload.get("emergency_mode", False)),
        emergency_group=payload.get("emergency_group"),
        signal_state=payload.get("signal_state"),
    )
    return decision


def decide_from_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    decision = decide_from_payload(payload)
    return json.dumps(decision)


if __name__ == "__main__":
    import sys

    if "pyodide" in sys.modules:
        pass
    else:
        # Minimal demo run for standalone presentation.
        model = TrafficDecisionModel()
        demo_routes = {
            "north_in_1": RouteMeta(group="NS"),
            "north_in_2": RouteMeta(group="NS"),
            "west_in_1": RouteMeta(group="EW"),
            "west_in_2": RouteMeta(group="EW"),
        }
        demo_vehicles = [
            VehicleState(route_id="north_in_1", wait_time=4.2, speed=1.2),
            VehicleState(route_id="north_in_2", wait_time=2.8, speed=1.6),
            VehicleState(route_id="west_in_1", wait_time=10.0, speed=0.9),
            VehicleState(route_id="west_in_2", wait_time=9.0, speed=0.8),
        ]
        result = model.decide(
            demo_vehicles,
            demo_routes,
            traffic_mode="medium",
            emergency_mode=False,
            emergency_group=None,
        )
        print(result)
