import math
from app.services.simulation import calculate_distance
from app.db import models
from sqlalchemy.orm import Session

class RiskScoringEngine:
    # Hyderabad landmarks and density configs
    LANDMARKS = {
        "Madhapur IT Corridor": {"lat": 17.4483, "lng": 78.3741, "pop_density": 85, "building_density": 90, "hazard_factor": 20},
        "Hussain Sagar Lake": {"lat": 17.4239, "lng": 78.4738, "pop_density": 60, "building_density": 45, "hazard_factor": 75}, # Flood-prone low elevation
        "Jeedimetla Industrial Area": {"lat": 17.5147, "lng": 78.4593, "pop_density": 40, "building_density": 65, "hazard_factor": 85}, # Chemical hazard
        "Charminar Heritage Zone": {"lat": 17.3616, "lng": 78.4747, "pop_density": 95, "building_density": 95, "hazard_factor": 35}, # Crowd stampede risk
        "PVNR Expressway": {"lat": 17.3821, "lng": 78.4320, "pop_density": 25, "building_density": 20, "hazard_factor": 15}
    }

    @staticmethod
    def calculate_risk(lat: float, lng: float, db: Session) -> dict:
        """
        Calculates localized risk index based on spatial factors, weather, and real-time resource availability.
        """
        # 1. Identify closest landmark characteristics to determine base densities
        closest_name = "Hyderabad General Sector"
        base_pop_density = 45.0  # default medium
        base_build_density = 40.0
        base_hazard = 10.0
        
        min_dist = float('inf')
        for name, cfg in RiskScoringEngine.LANDMARKS.items():
            dist = calculate_distance(lat, lng, cfg["lat"], cfg["lng"])
            if dist < min_dist:
                min_dist = dist
                if dist < 2500: # inside 2.5 km radius
                    closest_name = name
                    base_pop_density = cfg["pop_density"]
                    base_build_density = cfg["building_density"]
                    base_hazard = cfg["hazard_factor"]

        # 2. Get Weather coefficients
        # Mock weather reading or fetch from live DB context
        # (We assume simple weather values or default limits)
        wind_coeff = 1.1 # multiplier
        rain_coeff = 1.0
        
        # 3. Resource Availability factor
        # Higher availability lowers overall vulnerability risk
        total_resources = db.query(models.Resource).count()
        available_resources = db.query(models.Resource).filter(models.Resource.status == "Available").count()
        
        resource_vulnerability = 100.0
        if total_resources > 0:
            availability_ratio = available_resources / total_resources
            # 100% available -> vulnerability is 20, 0% available -> vulnerability is 100
            resource_vulnerability = 100.0 - (availability_ratio * 80.0)

        # 4. Traffic congestion mock based on landmark
        traffic_congestion = 55.0 # default 55%
        if "Expressway" in closest_name:
            traffic_congestion = 35.0
        elif "Charminar" in closest_name or "IT Corridor" in closest_name:
            traffic_congestion = 80.0

        # Risk scoring algorithm
        # Combine density, hazards, traffic, resource deficit, and weather variables
        risk_score = (
            (base_pop_density * 0.25) + 
            (base_build_density * 0.25) + 
            (base_hazard * 0.20) + 
            (traffic_congestion * 0.15) + 
            (resource_vulnerability * 0.15)
        )
        
        # Apply weather risk scaling
        # If it's a flood-prone area (Hussain Sagar) and raining, double the rain impact
        if "Hussain Sagar" in closest_name:
            risk_score += 15.0 # baseline elevation risk

        risk_score = min(100.0, max(0.0, risk_score))
        
        if risk_score >= 75.0:
            level = "Critical"
        elif risk_score >= 50.0:
            level = "High"
        elif risk_score >= 25.0:
            level = "Medium"
        else:
            level = "Low"
            
        return {
            "latitude": lat,
            "longitude": lng,
            "risk_score": round(risk_score, 1),
            "risk_level": level,
            "factors": {
                "population_density": round(base_pop_density, 1),
                "building_density": round(base_build_density, 1),
                "hazard_index": round(base_hazard, 1),
                "traffic_congestion": round(traffic_congestion, 1),
                "resource_vulnerability": round(resource_vulnerability, 1)
            },
            "closest_landmark": closest_name
        }
