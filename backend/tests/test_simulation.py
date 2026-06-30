import math
from app.services.simulation import SimulationEngine, calculate_distance

def test_calculate_distance():
    # Distance between same coordinates should be zero
    assert calculate_distance(40.7536, -73.9832, 40.7536, -73.9832) == 0.0
    
    # Distance between New York (40.7128, -74.0060) and Los Angeles (34.0522, -118.2437)
    # is roughly 3936 km
    dist = calculate_distance(40.7128, -74.0060, 34.0522, -118.2437)
    assert 3900000 < dist < 4000000

def test_generate_ellipse_coords():
    lat, lng = 40.7536, -73.9832
    radius_x, radius_y = 100, 50
    angle = 45
    points = 16
    
    coords = SimulationEngine._generate_ellipse_coords(lat, lng, radius_x, radius_y, angle, points)
    
    # Must return points + 1 coordinates (to close the loop)
    assert len(coords) == points + 1
    # First and last coordinates must be very close or identical (closed polygon)
    assert math.isclose(coords[0][0], coords[-1][0], abs_tol=1e-6)
    assert math.isclose(coords[0][1], coords[-1][1], abs_tol=1e-6)

def test_simulation_fire():
    params = {"windDirection": 90, "windSpeed": 15}
    tick = SimulationEngine.get_simulation_tick("fire", 40.7536, -73.9832, 5, 15, params)
    
    assert tick["tick"] == 5
    assert tick["max_ticks"] == 15
    assert tick["type"] == "fire"
    assert len(tick["zones"]) >= 2
    
    # Check that fire zone has a Polygon type
    fire_zone = next(z for z in tick["zones"] if "Active Fire" in z["name"])
    assert fire_zone["type"] == "Polygon"
    assert len(fire_zone["coordinates"]) > 0

def test_simulation_flood():
    params = {}
    tick = SimulationEngine.get_simulation_tick("flood", 40.7536, -73.9832, 5, 15, params)
    
    assert tick["type"] == "flood"
    assert len(tick["zones"]) >= 1
    
    # Check that high water accumulation is a Circle
    flood_zone = next(z for z in tick["zones"] if "High Water" in z["name"])
    assert flood_zone["type"] == "Circle"
    assert flood_zone["center"] == [40.7536, -73.9832]
    assert flood_zone["radius"] > 0

def test_simulation_building_collapse():
    params = {"windSpeed": 5}
    tick = SimulationEngine.get_simulation_tick("building collapse", 40.7536, -73.9832, 5, 15, params)
    
    assert tick["type"] == "building collapse"
    debris_zone = next(z for z in tick["zones"] if "Structural Rubble" in z["name"])
    assert debris_zone["type"] == "Circle"
    assert debris_zone["center"] == [40.7536, -73.9832]

def test_simulation_stampede():
    params = {"crowdSize": 1000}
    tick = SimulationEngine.get_simulation_tick("stampede", 40.7536, -73.9832, 5, 15, params)
    
    assert tick["type"] == "stampede"
    panic_epicenter = next(z for z in tick["zones"] if "Panic Epicenter" in z["name"])
    assert panic_epicenter["type"] == "Circle"
