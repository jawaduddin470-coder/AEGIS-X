import math
from typing import Dict, Any

class PredictionEngine:
    @staticmethod
    def get_predictions(sim_type: str, step: int, max_steps: int, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates live predictions for a running simulation or active incident.
        Returns:
            spread_probability (float)
            affected_population (int)
            escalation_risk (str: 'Low' | 'Medium' | 'High' | 'Critical')
            response_time (int: minutes)
            confidence_score (float)
            recommended_resources (List[str])
        """
        progress = step / max_steps if max_steps > 0 else 0
        
        # Fetch inputs
        wind_speed = float(params.get("windSpeed", 10.0))
        precipitation = float(params.get("waterRate", 5.0))
        crowd_size = int(params.get("crowdSize", 500))
        
        # Calculate prediction metrics based on incident characteristics
        if sim_type.lower() == "fire":
            spread_prob = min(99.0, 30.0 + progress * 50.0 + wind_speed * 0.7)
            affected_pop = int((progress * 400.0) * (1.1 + wind_speed * 0.04))
            escalation_risk = "Critical" if progress > 0.7 else "High" if progress > 0.4 else "Medium"
            confidence = max(65.0, 95.0 - progress * 15.0)
            recommended = ["3 Fire Trucks", "2 Ambulances", "1 Hazmat Command"]
        elif sim_type.lower() == "flood":
            spread_prob = min(99.0, 40.0 + progress * 40.0 + precipitation * 0.9)
            affected_pop = int((progress * 650.0) * (1.0 + precipitation * 0.05))
            escalation_risk = "Critical" if progress > 0.6 else "High" if progress > 0.35 else "Medium"
            confidence = max(70.0, 92.0 - progress * 10.0)
            recommended = ["4 Rescue Boats", "2 High-Clearance Trucks", "2 BLS Ambulances"]
        elif sim_type.lower() in ["chemical", "chemical leak"]:
            spread_prob = min(99.0, 50.0 + progress * 35.0 + wind_speed * 0.8)
            affected_pop = int((progress * 800.0) * (1.2 + wind_speed * 0.06))
            escalation_risk = "Critical" if progress > 0.5 else "High" if progress > 0.25 else "Medium"
            confidence = max(60.0, 88.0 - progress * 20.0)
            recommended = ["2 Hazmat Units", "3 Decontamination Teams", "2 ALS Ambulances"]
        elif sim_type.lower() == "stampede":
            spread_prob = min(99.0, 45.0 + progress * 40.0 + (crowd_size / 2000.0) * 10.0)
            affected_pop = int((progress * crowd_size) * 0.85)
            escalation_risk = "Critical" if progress > 0.65 else "High" if progress > 0.4 else "Medium"
            confidence = max(75.0, 96.0 - progress * 12.0)
            recommended = ["4 Police Patrols", "3 BLS Ambulances", "1 Crisis Coordinator"]
        else: # Building Collapse / Traffic Accident
            spread_prob = min(99.0, 20.0 + progress * 20.0)
            affected_pop = int(45 + progress * 150)
            escalation_risk = "High" if progress > 0.8 else "Medium" if progress > 0.3 else "Low"
            confidence = max(80.0, 98.0 - progress * 8.0)
            recommended = ["2 Rescue Engines", "2 ALS Ambulances", "1 Heavy Crane"]
            
        return {
            "spread_probability": round(spread_prob, 1),
            "affected_population": max(0, affected_pop),
            "escalation_risk": escalation_risk,
            "response_time": max(2, math.ceil(8 * (1.0 - progress))), # ETA in mins
            "confidence_score": round(confidence, 1),
            "recommended_resources": recommended
        }
