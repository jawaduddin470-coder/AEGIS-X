import math
import time
import random
from typing import Dict, Any, List

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance in meters between two coordinates using Haversine formula."""
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class SimulationEngine:
    @staticmethod
    def get_simulation_tick(
        sim_type: str, 
        center_lat: float, 
        center_lng: float, 
        step: int, 
        max_steps: int, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates a simulation frame/tick.
        Returns coordinates, radius, intensity, and affected elements.
        """
        progress = step / max_steps
        intensity = max(0.1, 1.0 - (progress * 0.3) + random.uniform(-0.05, 0.05))
        
        # Base geometries
        impact_zones = []
        affected_entities = []
        
        # Fetch parameters
        wind_direction = float(params.get("windDirection", 0))  # degrees
        wind_speed = float(params.get("windSpeed", 10))          # km/h
        water_rate = float(params.get("waterRate", 5))          # mm/h
        crowd_size = int(params.get("crowdSize", 500))          # count
        
        if sim_type.lower() == "fire":
            # Fire spreads radially, elongated in the direction of the wind
            base_radius = 50 + (progress * 400)  # reaches up to 450 meters
            wind_offset_distance = progress * wind_speed * 10
            
            # Calculate offset center based on wind
            angle_rad = math.radians(wind_direction)
            # Offset center in meters converted to approx lat/lng (1 degree approx 111,000 meters)
            offset_lat = center_lat + (wind_offset_distance * math.cos(angle_rad)) / 111000.0
            offset_lng = center_lng + (wind_offset_distance * math.sin(angle_rad)) / (111000.0 * math.cos(math.radians(center_lat)))
            
            # Primary Fire Zone
            impact_zones.append({
                "type": "Polygon",
                "name": "Active Fire Burn Area",
                "coordinates": SimulationEngine._generate_ellipse_coords(offset_lat, offset_lng, base_radius, base_radius * 0.7, wind_direction),
                "style": {"fillColor": "#E63946", "fillOpacity": 0.4, "strokeColor": "#D90429", "weight": 2}
            })
            # Secondary Smoke Zone
            impact_zones.append({
                "type": "Polygon",
                "name": "Heavy Smoke/Plume Zone",
                "coordinates": SimulationEngine._generate_ellipse_coords(offset_lat + (progress * 100 / 111000.0), offset_lng, base_radius * 1.8, base_radius * 1.1, wind_direction),
                "style": {"fillColor": "#6C757D", "fillOpacity": 0.2, "strokeColor": "#495057", "weight": 1, "dashArray": "5, 5"}
            })
            
        elif sim_type.lower() == "flood":
            # Flood spreads outward, covering topography
            base_radius = 100 + (progress * 600)  # spreads up to 700 meters
            # Create a water flow path
            impact_zones.append({
                "type": "Circle",
                "name": "High Water Accumulation",
                "center": [center_lat, center_lng],
                "radius": base_radius,
                "style": {"fillColor": "#4A90E2", "fillOpacity": 0.35, "strokeColor": "#0F2D52", "weight": 2}
            })
            # Sub-channels representing runoff
            for i in range(4):
                angle = (i * 90) + (step * 5)
                angle_rad = math.radians(angle)
                dist = base_radius * 1.2
                flow_lat = center_lat + (dist * math.cos(angle_rad)) / 111000.0
                flow_lng = center_lng + (dist * math.sin(angle_rad)) / (111000.0 * math.cos(math.radians(center_lat)))
                impact_zones.append({
                    "type": "Circle",
                    "name": "Runoff Inundation",
                    "center": [flow_lat, flow_lng],
                    "radius": base_radius * 0.3,
                    "style": {"fillColor": "#4A90E2", "fillOpacity": 0.2, "strokeColor": "#4A90E2", "weight": 1}
                })
                
        elif sim_type.lower() == "building collapse":
            # Structural collapse has shockwave radius and debris radius
            base_radius = 30 + (progress * 50)  # static debris radius around 80m
            dust_radius = 100 + (progress * 300) # expanding dust clouds
            
            # Debris Zone
            impact_zones.append({
                "type": "Circle",
                "name": "Structural Rubble Zone",
                "center": [center_lat, center_lng],
                "radius": base_radius,
                "style": {"fillColor": "#F4A261", "fillOpacity": 0.5, "strokeColor": "#E76F51", "weight": 3}
            })
            # Dust plume
            dust_angle = wind_direction
            dust_offset = progress * wind_speed * 6
            dust_lat = center_lat + (dust_offset * math.cos(math.radians(dust_angle))) / 111000.0
            dust_lng = center_lng + (dust_offset * math.sin(math.radians(dust_angle))) / (111000.0 * math.cos(math.radians(center_lat)))
            impact_zones.append({
                "type": "Circle",
                "name": "Aerosolized Debris/Dust Cloud",
                "center": [dust_lat, dust_lng],
                "radius": dust_radius,
                "style": {"fillColor": "#D3D3D3", "fillOpacity": 0.25, "strokeColor": "#A9A9A9", "weight": 1}
            })

        elif sim_type.lower() == "stampede":
            # Stampede propagation has panic epicenter and evacuation choke points
            base_radius = 20 + (progress * 250)
            
            impact_zones.append({
                "type": "Circle",
                "name": "Panic Epicenter",
                "center": [center_lat, center_lng],
                "radius": base_radius * 0.4,
                "style": {"fillColor": "#9D4EDD", "fillOpacity": 0.4, "strokeColor": "#7B2CBF", "weight": 2}
            })
            
            impact_zones.append({
                "type": "Circle",
                "name": "Crowd Dispersion Boundary",
                "center": [center_lat, center_lng],
                "radius": base_radius,
                "style": {"fillColor": "#C8B6FF", "fillOpacity": 0.15, "strokeColor": "#9D4EDD", "weight": 1, "dashArray": "3, 6"}
            })

        elif sim_type.lower() in ["chemical leak", "chemical"]:
            # Chemical leak expands downwind in an elongated cone shape
            base_radius = 40 + (progress * 300) # reaches up to 340 meters
            plume_length = base_radius * 2.0
            
            # Plume angle is downwind (wind_direction)
            angle_rad = math.radians(wind_direction)
            
            # Epicenter of toxic source
            impact_zones.append({
                "type": "Circle",
                "name": "Toxic Source Epicenter",
                "center": [center_lat, center_lng],
                "radius": base_radius * 0.3,
                "style": {"fillColor": "#39FF14", "fillOpacity": 0.5, "strokeColor": "#00FF00", "weight": 2}
            })
            
            # Expanding chemical gas plume cone
            plume_center_lat = center_lat + (plume_length * 0.5 * math.cos(angle_rad)) / 111000.0
            plume_center_lng = center_lng + (plume_length * 0.5 * math.sin(angle_rad)) / (111000.0 * math.cos(math.radians(center_lat)))
            
            impact_zones.append({
                "type": "Polygon",
                "name": "Toxic Dispersion Plume",
                "coordinates": SimulationEngine._generate_ellipse_coords(plume_center_lat, plume_center_lng, plume_length * 0.6, base_radius * 0.8, wind_direction),
                "style": {"fillColor": "#20C997", "fillOpacity": 0.25, "strokeColor": "#198754", "weight": 1.5, "dashArray": "4, 4"}
            })

        # Calculate coordinates of buildings, response teams, or shelters impacted by this frame
        # (This is processed in the api/websocket loop against actual active DB entities)

        return {
            "tick": step,
            "max_ticks": max_steps,
            "type": sim_type,
            "center": [center_lat, center_lng],
            "intensity": round(intensity, 2),
            "zones": impact_zones
        }

    @staticmethod
    def _generate_ellipse_coords(lat: float, lng: float, radius_x: float, radius_y: float, angle_deg: float, points: int = 16) -> List[List[float]]:
        """Generates outer boundary coordinates for an ellipse in lat/lng coordinate space."""
        coords = []
        angle_rad = math.radians(angle_deg)
        
        # Radii in degrees coordinates (roughly)
        r_lat_x = radius_x / 111000.0
        r_lng_x = radius_x / (111000.0 * math.cos(math.radians(lat)))
        
        r_lat_y = radius_y / 111000.0
        r_lng_y = radius_y / (111000.0 * math.cos(math.radians(lat)))
        
        for i in range(points + 1):
            t = (i * 2 * math.pi) / points
            # Standard parametric ellipse equations
            dx_local = math.cos(t)
            dy_local = math.sin(t)
            
            # Rotate local coords by the angle
            dx_rot = dx_local * math.cos(angle_rad) - dy_local * math.sin(angle_rad)
            dy_rot = dx_local * math.sin(angle_rad) + dy_local * math.cos(angle_rad)
            
            p_lat = lat + dx_rot * r_lat_x
            p_lng = lng + dy_rot * r_lng_y
            coords.append([p_lat, p_lng])
            
        return coords
