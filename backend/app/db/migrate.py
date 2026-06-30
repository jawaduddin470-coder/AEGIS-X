"""
AEGIS X — Production Database Migration & Seed Script
Creates all tables + populates realistic Hyderabad demo data
Run: python -m app.db.migrate
"""
import datetime
import json
import sys
import logging
from passlib.context import CryptContext
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def run_migrations():
    """Create all tables in the database."""
    try:
        from app.db.database import Base, engine, test_connection
        from app.db import models  # noqa — registers all models

        if not test_connection():
            logger.error("Cannot reach database — aborting migration.")
            sys.exit(1)

        logger.info("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All tables created successfully.")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


def seed_data():
    """Populate database with realistic Hyderabad demo data."""
    from app.db.database import SessionLocal
    from app.db.models import (
        User, Incident, IncidentTimeline, Resource, Shelter,
        Hospital, Station, Prediction, AnalyticsSnapshot,
        Broadcast, AuditLog
    )

    db = SessionLocal()
    now = datetime.datetime.utcnow()

    try:
        # ── Skip if already seeded ────────────────────────────────────────
        if db.query(User).count() > 0:
            logger.info("Database already seeded. Skipping.")
            return

        logger.info("Seeding Hyderabad demo data...")
        DEFAULT_HASH = "$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2"

        # ── 1. USERS ──────────────────────────────────────────────────────
        users = [
            User(
                email="admin@aegisx.in",
                password_hash=DEFAULT_HASH,
                full_name="Dr. K. Ramaiah",
                phone="+91-9100000001",
                role="Super Administrator",
                department="GHMC Command Centre",
                badge_number="GHMC-001",
                status="Active",
                latitude=17.3850, longitude=78.4867,
                language="en",
            ),
            User(
                email="operator@aegisx.in",
                password_hash=DEFAULT_HASH,
                full_name="Smt. Priya Reddy",
                phone="+91-9100000002",
                role="Operator",
                department="Emergency Operations Centre",
                badge_number="EOC-042",
                status="Active",
                latitude=17.3900, longitude=78.4900,
                language="te",
            ),
            User(
                email="fire@aegisx.in",
                password_hash=DEFAULT_HASH,
                full_name="SI Mohammed Farouk",
                phone="+91-9100000003",
                role="Responder",
                department="Hyderabad Fire Department",
                badge_number="HFD-117",
                status="Active",
                latitude=17.4200, longitude=78.4600,
                language="hi",
            ),
            User(
                email="ndrf@aegisx.in",
                password_hash=DEFAULT_HASH,
                full_name="Capt. Arjun Singh",
                phone="+91-9100000004",
                role="Responder",
                department="NDRF Battalion 10",
                badge_number="NDRF-10-023",
                status="Busy",
                latitude=17.3600, longitude=78.5200,
                language="hi",
            ),
            User(
                email="citizen@aegisx.in",
                password_hash=DEFAULT_HASH,
                full_name="Ravi Kumar",
                phone="+91-9876543210",
                role="Citizen",
                department=None,
                status="Active",
                latitude=17.3950, longitude=78.5000,
                language="te",
            ),
        ]
        db.add_all(users)
        db.flush()

        # ── 2. INCIDENTS (Hyderabad realistic scenarios) ──────────────────
        incidents_data = [
            {
                "incident_code": "INC-2025-0001",
                "type": "Flood",
                "severity": "Critical",
                "description": "Severe waterlogging reported near Hussain Sagar Lake. Multiple vehicles stranded. Nala overflow affecting Banjara Hills Road No. 12.",
                "latitude": 17.4239, "longitude": 78.4738,
                "location_name": "Hussain Sagar Lake Bund, Banjara Hills",
                "address": "Road No. 12, Banjara Hills, Hyderabad - 500034",
                "district": "Hyderabad", "zone": "Central",
                "status": "Active", "priority_score": 92.0,
                "victims_count": 45, "evacuated_count": 30,
                "citizen_id": users[4].id, "responder_id": users[2].id,
            },
            {
                "incident_code": "INC-2025-0002",
                "type": "Fire",
                "severity": "High",
                "description": "Commercial building fire at Hi-Tech City. Smoke visible from 2km radius. 3 floors affected. IT professionals evacuating.",
                "latitude": 17.4473, "longitude": 78.3762,
                "location_name": "Cyber Pearl Building, HITEC City",
                "address": "HITEC City Main Road, Madhapur, Hyderabad - 500081",
                "district": "Hyderabad", "zone": "West",
                "status": "Dispatched", "priority_score": 87.5,
                "victims_count": 12, "evacuated_count": 200,
                "citizen_id": users[4].id, "responder_id": users[2].id,
            },
            {
                "incident_code": "INC-2025-0003",
                "type": "Building Collapse",
                "severity": "Critical",
                "description": "Partial collapse of old residential structure in Old City. Debris rescue operation underway. NDRF team requested.",
                "latitude": 17.3616, "longitude": 78.4747,
                "location_name": "Charminar Area, Hyderabad Old City",
                "address": "Near Charminar, Gulzar Houz, Hyderabad - 500002",
                "district": "Hyderabad", "zone": "South",
                "status": "Active", "priority_score": 95.0,
                "victims_count": 8, "casualties_count": 2, "evacuated_count": 40,
                "citizen_id": users[4].id, "responder_id": users[3].id,
            },
            {
                "incident_code": "INC-2025-0004",
                "type": "Traffic Accident",
                "severity": "Medium",
                "description": "Multi-vehicle accident on ORR near Patancheru. 2 trucks and 4 cars involved. Lane blockage causing 3km queue.",
                "latitude": 17.5297, "longitude": 78.2564,
                "location_name": "Outer Ring Road, Patancheru",
                "address": "ORR Exit 14, Patancheru, Hyderabad - 502319",
                "district": "Sangareddy", "zone": "North",
                "status": "Resolved", "priority_score": 55.0,
                "victims_count": 6, "evacuated_count": 0,
                "citizen_id": users[4].id,
                "resolved_at": now - datetime.timedelta(hours=2),
            },
            {
                "incident_code": "INC-2025-0005",
                "type": "Chemical Leak",
                "severity": "High",
                "description": "Toxic gas leak reported at pharmaceutical plant in Jeedimetla Industrial Area. 500m exclusion zone activated.",
                "latitude": 17.5127, "longitude": 78.4440,
                "location_name": "Jeedimetla Industrial Area",
                "address": "Plot 44, Phase III, Jeedimetla, Hyderabad - 500055",
                "district": "Medchal", "zone": "North",
                "status": "Investigating", "priority_score": 78.0,
                "victims_count": 3,
                "citizen_id": users[4].id,
            },
        ]

        incidents = []
        for d in incidents_data:
            inc = Incident(**d, reported_at=now - datetime.timedelta(hours=len(incidents_data) - len(incidents)))
            db.add(inc)
            incidents.append(inc)
        db.flush()

        # ── 3. INCIDENT TIMELINES ─────────────────────────────────────────
        timelines = [
            IncidentTimeline(incident_id=incidents[0].id, timestamp="08:15 AM", event="Flood alert received from Banjara Hills", status="Warning", actor="System"),
            IncidentTimeline(incident_id=incidents[0].id, timestamp="08:22 AM", event="EOC activated — 2 NDRF boats deployed", status="Info", actor="Priya Reddy"),
            IncidentTimeline(incident_id=incidents[0].id, timestamp="08:45 AM", event="30 civilians evacuated to Community Hall", status="Success", actor="Mohammed Farouk"),
            IncidentTimeline(incident_id=incidents[1].id, timestamp="10:30 AM", event="Fire outbreak reported — Hi-Tech City", status="Critical", actor="System"),
            IncidentTimeline(incident_id=incidents[1].id, timestamp="10:35 AM", event="3 fire tenders dispatched from Jubilee Hills station", status="Info", actor="EOC"),
            IncidentTimeline(incident_id=incidents[2].id, timestamp="06:45 AM", event="Building collapse reported near Charminar", status="Critical", actor="Citizen"),
            IncidentTimeline(incident_id=incidents[2].id, timestamp="06:52 AM", event="NDRF Team 10 dispatched — ETA 18 mins", status="Info", actor="EOC"),
            IncidentTimeline(incident_id=incidents[2].id, timestamp="07:10 AM", event="2 survivors extracted — Heavy machinery required", status="Warning", actor="Arjun Singh"),
        ]
        db.add_all(timelines)

        # ── 4. RESOURCES / VEHICLES ───────────────────────────────────────
        resources = [
            Resource(name="Ambulance HYD-AMB-01", type="Ambulance", registration="TS09EA0101", department="Emergency Medical Services", capacity=2, max_capacity=2, latitude=17.4100, longitude=78.4800, base_station="Gandhi Hospital", current_zone="Central", status="Dispatched", driver_name="Venkat Rao", driver_phone="+91-9000001001", crew_count=3, fuel_level=78),
            Resource(name="Ambulance HYD-AMB-02", type="Ambulance", registration="TS09EA0102", department="Emergency Medical Services", capacity=2, max_capacity=2, latitude=17.3900, longitude=78.5000, base_station="Osmania Hospital", current_zone="South", status="Available", driver_name="Suresh Kumar", driver_phone="+91-9000001002", crew_count=2, fuel_level=90),
            Resource(name="Fire Tender HFD-FT-01", type="Fire Truck", registration="TS01Z0001", department="Hyderabad Fire Department", capacity=6, max_capacity=6, latitude=17.4473, longitude=78.3762, base_station="Jubilee Hills Fire Station", current_zone="West", status="Dispatched", driver_name="Ramesh D.", driver_phone="+91-9000002001", crew_count=6, fuel_level=65),
            Resource(name="Fire Tender HFD-FT-02", type="Fire Truck", registration="TS01Z0002", department="Hyderabad Fire Department", capacity=6, max_capacity=6, latitude=17.3850, longitude=78.4867, base_station="Nampally Fire Station", current_zone="Central", status="Available", driver_name="Shankar B.", driver_phone="+91-9000002002", crew_count=6, fuel_level=95),
            Resource(name="Police PCR HYD-PCR-01", type="Police Vehicle", registration="TS09P0001", department="Hyderabad Police", capacity=4, max_capacity=4, latitude=17.4300, longitude=78.4500, base_station="Banjara Hills PS", current_zone="West", status="Available", driver_name="Constable Naresh", driver_phone="+91-9000003001", crew_count=4, fuel_level=88),
            Resource(name="Police PCR HYD-PCR-02", type="Police Vehicle", registration="TS09P0002", department="Hyderabad Police", capacity=4, max_capacity=4, latitude=17.3616, longitude=78.4747, base_station="Charminar PS", current_zone="South", status="Dispatched", driver_name="SI Krishnamurthy", driver_phone="+91-9000003002", crew_count=3, fuel_level=55),
            Resource(name="NDRF Boat TS-10-B1", type="Rescue Boat", registration="NDRF-10-B01", department="NDRF Battalion 10", capacity=12, max_capacity=12, latitude=17.4239, longitude=78.4738, base_station="NDRF Camp, Golconda", current_zone="Central", status="Dispatched", driver_name="Capt. Arjun Singh", driver_phone="+91-9000004001", crew_count=8, fuel_level=72),
            Resource(name="GHMC Heavy Crane", type="Heavy Machinery", registration="TS09GC001", department="GHMC", capacity=2, max_capacity=2, latitude=17.3616, longitude=78.4747, base_station="GHMC Depot, Malakpet", current_zone="South", status="Dispatched", driver_name="Operator Gopi", driver_phone="+91-9000005001", crew_count=2, fuel_level=60),
        ]
        db.add_all(resources)

        # ── 5. SHELTERS ───────────────────────────────────────────────────
        shelters = [
            Shelter(name="Charminar Community Hall", type="Community Centre", address="Charminar Road, Hyderabad - 500002", district="Hyderabad", zone="South", latitude=17.3616, longitude=78.4742, total_capacity=800, current_occupancy=340, status="Active", is_wheelchair_accessible=True, has_medical_facility=True, has_food_supply=True, has_water_supply=True, has_power_backup=True, manager_name="Abdul Raheem", manager_phone="+91-9876001001"),
            Shelter(name="Banjara Hills Government School", type="School", address="Road No. 14, Banjara Hills, Hyderabad - 500034", district="Hyderabad", zone="Central", latitude=17.4156, longitude=78.4383, total_capacity=500, current_occupancy=0, status="Standby", is_wheelchair_accessible=False, has_medical_facility=False, has_food_supply=False, has_water_supply=True, has_power_backup=False, manager_name="Headmaster Ravi Shankar", manager_phone="+91-9876002001"),
            Shelter(name="LB Stadium — North Stand", type="Stadium", address="Fateh Maidan, Hyderabad - 500001", district="Hyderabad", zone="Central", latitude=17.3961, longitude=78.4741, total_capacity=5000, current_occupancy=120, status="Active", is_wheelchair_accessible=True, has_medical_facility=True, has_food_supply=True, has_water_supply=True, has_power_backup=True, manager_name="Collector S. Ramachandra", manager_phone="+91-9876003001"),
            Shelter(name="Secunderabad Railway Station Hall", type="Community Centre", address="Station Road, Secunderabad - 500003", district="Secunderabad", zone="North", latitude=17.4344, longitude=78.5013, total_capacity=2000, current_occupancy=0, status="Standby", is_wheelchair_accessible=True, has_medical_facility=False, has_food_supply=False, has_water_supply=True, has_power_backup=True, manager_name="SCR Welfare Officer", manager_phone="+91-9876004001"),
            Shelter(name="Kukatpally YMCA Ground", type="Open Ground", address="KPHB Colony, Kukatpally, Hyderabad - 500085", district="Hyderabad", zone="North", latitude=17.4948, longitude=78.3996, total_capacity=3000, current_occupancy=0, status="Standby", is_wheelchair_accessible=False, has_medical_facility=False, has_food_supply=False, has_water_supply=True, has_power_backup=False, manager_name="Zone Commissioner NW", manager_phone="+91-9876005001"),
        ]
        db.add_all(shelters)

        # ── 6. HOSPITALS ──────────────────────────────────────────────────
        hospitals = [
            Hospital(name="Osmania General Hospital", type="Government", address="Afzal Gunj, Hyderabad - 500012", district="Hyderabad", latitude=17.3763, longitude=78.4832, total_beds=1500, available_beds=320, icu_beds=60, icu_available=18, trauma_bays=8, has_blood_bank=True, has_dialysis=True, has_ventilators=True, ventilator_count=45, phone="040-24600101", emergency_phone="040-24600111", status="Operational"),
            Hospital(name="Gandhi Hospital", type="Government", address="Musheerabad, Hyderabad - 500003", district="Hyderabad", latitude=17.4138, longitude=78.4962, total_beds=1200, available_beds=180, icu_beds=48, icu_available=12, trauma_bays=6, has_blood_bank=True, has_dialysis=True, has_ventilators=True, ventilator_count=38, phone="040-27505566", emergency_phone="040-27505577", status="Operational"),
            Hospital(name="Yashoda Hospital Secunderabad", type="Private", address="Alexander Road, Secunderabad - 500003", district="Secunderabad", latitude=17.4366, longitude=78.5012, total_beds=600, available_beds=95, icu_beds=42, icu_available=8, trauma_bays=4, has_blood_bank=True, has_dialysis=True, has_ventilators=True, ventilator_count=28, phone="040-44555555", emergency_phone="040-44555533", status="Operational"),
            Hospital(name="CARE Hospitals HITEC City", type="Private", address="Road No. 1, Banjara Hills, Hyderabad - 500034", district="Hyderabad", latitude=17.4151, longitude=78.4497, total_beds=450, available_beds=67, icu_beds=36, icu_available=5, trauma_bays=3, has_blood_bank=True, has_dialysis=False, has_ventilators=True, ventilator_count=20, phone="040-30410000", emergency_phone="040-30410099", status="Operational"),
            Hospital(name="Niloufer Hospital (Children)", type="Government", address="Red Hills, Lakdikapul, Hyderabad - 500004", district="Hyderabad", latitude=17.3908, longitude=78.4636, total_beds=800, available_beds=210, icu_beds=30, icu_available=9, trauma_bays=4, has_blood_bank=True, has_dialysis=False, has_ventilators=True, ventilator_count=15, phone="040-23301421", emergency_phone="040-23301422", status="Operational"),
        ]
        db.add_all(hospitals)

        # ── 7. POLICE & FIRE STATIONS ─────────────────────────────────────
        stations = [
            Station(name="Banjara Hills Police Station", type="Police", address="Road No. 12, Banjara Hills, Hyd - 500034", district="Hyderabad", zone="West", latitude=17.4156, longitude=78.4383, phone="040-23510610", officer_in_charge="DCP Suresh Reddy", total_staff=85, available_staff=62, is_operational=True),
            Station(name="Charminar Police Station", type="Police", address="Charminar Road, Hyd - 500002", district="Hyderabad", zone="South", latitude=17.3600, longitude=78.4742, phone="040-24452444", officer_in_charge="CI Mohammed Ilyas", total_staff=70, available_staff=48, is_operational=True),
            Station(name="Jubilee Hills Fire Station", type="Fire", address="Road No. 36, Jubilee Hills, Hyd - 500033", district="Hyderabad", zone="West", latitude=17.4321, longitude=78.4087, phone="040-23551000", officer_in_charge="DFO K. Kishore Kumar", total_staff=40, available_staff=28, is_operational=True),
            Station(name="Nampally Fire Station", type="Fire", address="Abids Road, Nampally, Hyd - 500001", district="Hyderabad", zone="Central", latitude=17.3886, longitude=78.4732, phone="040-24601115", officer_in_charge="SFO Ravi Teja", total_staff=35, available_staff=30, is_operational=True),
            Station(name="Secunderabad Police Station", type="Police", address="SD Road, Secunderabad - 500003", district="Secunderabad", zone="North", latitude=17.4352, longitude=78.5014, phone="040-27808282", officer_in_charge="Inspector Chandrasekhar", total_staff=90, available_staff=70, is_operational=True),
            Station(name="Madhapur Police Station", type="Police", address="Madhapur, HITEC City, Hyd - 500081", district="Hyderabad", zone="West", latitude=17.4490, longitude=78.3833, phone="040-23191234", officer_in_charge="CI Srinivas Goud", total_staff=65, available_staff=52, is_operational=True),
        ]
        db.add_all(stations)

        # ── 8. PREDICTIONS ────────────────────────────────────────────────
        predictions = [
            Prediction(prediction_type="flood", latitude=17.3850, longitude=78.4867, location_name="Hussain Sagar Basin", district="Hyderabad", risk_level="High", probability=0.78, confidence=0.85, factors=json.dumps({"rainfall_mm": 82, "reservoir_level_pct": 91, "soil_saturation": 0.87, "wind_speed_kmh": 28}), recommendations=json.dumps(["Pre-position 5 rescue boats at Banjara Hills", "Issue Level-2 flood alert for Low-lying areas", "Open LB Stadium shelter"]), affected_area_km2=12.5, affected_population=45000, valid_from=now, valid_until=now + datetime.timedelta(hours=24), is_active=True),
            Prediction(prediction_type="fire", latitude=17.4473, longitude=78.3762, location_name="HITEC City", district="Hyderabad", risk_level="Moderate", probability=0.42, confidence=0.71, factors=json.dumps({"temperature_c": 38, "humidity_pct": 22, "wind_speed_kmh": 18, "dry_days_count": 7}), recommendations=json.dumps(["Inspect fire suppression systems in IT towers", "Place 2 fire tenders on standby near Cyber Gateway"]), affected_area_km2=3.2, affected_population=12000, valid_from=now, valid_until=now + datetime.timedelta(hours=12), is_active=True),
        ]
        db.add_all(predictions)

        # ── 9. BROADCASTS ─────────────────────────────────────────────────
        broadcasts = [
            Broadcast(title="🌧️ Heavy Rainfall Advisory — Hyderabad", message="IMD has issued heavy rainfall warning for Hyderabad district. Citizens in low-lying areas of Banjara Hills, Tarnaka, and Musheerabad are advised to avoid travel. GHMC flood control room active: 040-29555500.", type="Alert", severity="Warning", channel="all", target_audience="all", status="Sent", sent_count=142500, read_count=89000, author_id=users[0].id, sent_at=now - datetime.timedelta(hours=3)),
            Broadcast(title="🚧 Road Closure — Charminar Area", message="Charminar — Abids Road closed for rescue operations following building collapse. Use Shalibanda — Chaderghat alternate route. Expected clearance: 6–8 hours.", type="General", severity="Info", channel="web,push", target_audience="citizens", status="Sent", sent_count=28000, read_count=14000, author_id=users[1].id, sent_at=now - datetime.timedelta(hours=5)),
        ]
        db.add_all(broadcasts)

        # ── 10. ANALYTICS SNAPSHOT ────────────────────────────────────────
        analytics = AnalyticsSnapshot(
            snapshot_type="daily",
            period_start=now.replace(hour=0, minute=0, second=0),
            period_end=now,
            total_incidents=5,
            resolved_incidents=1,
            avg_response_time=8.4,
            avg_resolution_time=142.0,
            incident_by_type=json.dumps({"Flood": 1, "Fire": 1, "Building Collapse": 1, "Traffic Accident": 1, "Chemical Leak": 1}),
            incident_by_severity=json.dumps({"Critical": 2, "High": 2, "Medium": 1, "Low": 0}),
            incident_by_zone=json.dumps({"Central": 2, "South": 1, "West": 1, "North": 1}),
            total_dispatches=8,
            resource_utilization=62.5,
            total_victims_helped=74,
            total_evacuated=370,
        )
        db.add(analytics)

        db.commit()
        logger.info("✅ Hyderabad demo data seeded successfully!")
        logger.info(f"  Users: {len(users)} | Incidents: {len(incidents_data)} | Resources: {len(resources)}")
        logger.info(f"  Shelters: {len(shelters)} | Hospitals: {len(hospitals)} | Stations: {len(stations)}")

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migrations()
    seed_data()
    logger.info("\n🚀 AEGIS X database is ready for production!")
