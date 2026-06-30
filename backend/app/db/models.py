"""
AEGIS X — Production Database Models
Neon PostgreSQL + PostGIS compatible
All tables: Users, Roles, Incidents, Vehicles, Resources, Shelters,
             Hospitals, Notifications, Analytics, Predictions, Audit Logs
"""
import datetime
import json
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Text, Boolean, BigInteger, Index
)
from sqlalchemy.orm import relationship
from app.db.database import Base


# ──────────────────────────────────────────────────────────────────────────────
# USERS & ROLES
# ──────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(512), nullable=True)   # nullable for Firebase-only auth
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), default="Citizen", nullable=False)
    department = Column(String(100), nullable=True)      # GHMC, Police, Fire, NDRF, etc.
    badge_number = Column(String(50), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    status = Column(String(20), default="Active")        # Active, Busy, Offline, Suspended

    # Firebase UID for auth
    firebase_uid = Column(String(255), unique=True, nullable=True, index=True)

    # FCM Push token
    fcm_token = Column(String(512), nullable=True)

    # Real-time location (responders)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_seen = Column(DateTime, nullable=True)

    # Preferences
    language = Column(String(10), default="en")
    notifications_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    reported_incidents = relationship("Incident", foreign_keys="Incident.citizen_id", back_populates="citizen")
    assigned_incidents = relationship("Incident", foreign_keys="Incident.responder_id", back_populates="responder")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


# ──────────────────────────────────────────────────────────────────────────────
# INCIDENTS
# ──────────────────────────────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String(20), unique=True, index=True, nullable=True)  # e.g. INC-2025-0042

    type = Column(String(100), nullable=False)      # Fire, Flood, Building Collapse, etc.
    severity = Column(String(20), default="Medium") # Low, Medium, High, Critical
    description = Column(Text, nullable=True)
    photo_url = Column(String(512), nullable=True)  # Cloudinary URL
    video_url = Column(String(512), nullable=True)  # Cloudinary URL
    audio_url = Column(String(512), nullable=True)  # Cloudinary URL

    # Geospatial
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(512), nullable=True)
    address = Column(String(512), nullable=True)
    district = Column(String(100), nullable=True, default="Hyderabad")
    zone = Column(String(100), nullable=True)       # North, South, East, West, Central

    # Status flow
    status = Column(String(50), default="Reported")  # Reported, Investigating, Dispatched, Active, Contained, Resolved, Closed
    priority_score = Column(Float, default=0.0)      # AI-computed priority 0–100

    # People affected
    victims_count = Column(Integer, default=0)
    casualties_count = Column(Integer, default=0)
    evacuated_count = Column(Integer, default=0)

    # AI Analysis
    ai_analysis = Column(Text, nullable=True)        # JSON string with AI suggestions
    ai_risk_score = Column(Float, nullable=True)
    predicted_escalation = Column(Boolean, default=False)

    # Timestamps
    reported_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    dispatched_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Foreign keys
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    responder_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="reported_incidents")
    responder = relationship("User", foreign_keys=[responder_id], back_populates="assigned_incidents")
    timeline = relationship("IncidentTimeline", back_populates="incident", cascade="all, delete-orphan")
    dispatches = relationship("VehicleDispatch", back_populates="incident")


# ──────────────────────────────────────────────────────────────────────────────
# INCIDENT TIMELINE
# ──────────────────────────────────────────────────────────────────────────────

class IncidentTimeline(Base):
    __tablename__ = "incident_timelines"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    timestamp = Column(String(20), nullable=False)
    event = Column(String(512), nullable=False)
    status = Column(String(20), default="Info")   # Info, Warning, Critical, Success
    actor = Column(String(255), nullable=True)     # who triggered this event
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="timeline")


# ──────────────────────────────────────────────────────────────────────────────
# VEHICLES / RESOURCES
# ──────────────────────────────────────────────────────────────────────────────

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)      # Ambulance, Fire Truck, Police Vehicle, etc.
    registration = Column(String(50), nullable=True, unique=True)
    department = Column(String(100), nullable=True) # GHMC, Police, Fire, NDRF, etc.

    # Capacity
    capacity = Column(Integer, default=1)
    max_capacity = Column(Integer, default=1)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    base_station = Column(String(255), nullable=True)
    current_zone = Column(String(100), nullable=True)

    # Status
    status = Column(String(30), default="Available")  # Available, Dispatched, Busy, Maintenance, Offline
    fuel_level = Column(Integer, default=100)          # 0–100 percent
    condition = Column(String(20), default="Good")     # Good, Fair, Poor

    # Driver / Crew
    driver_name = Column(String(255), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    crew_count = Column(Integer, default=1)

    # Timing
    eta = Column(Integer, nullable=True)             # minutes to scene
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    assigned_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    assigned_incident = relationship("Incident", foreign_keys=[assigned_incident_id])
    dispatches = relationship("VehicleDispatch", back_populates="resource")


class VehicleDispatch(Base):
    __tablename__ = "vehicle_dispatches"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    dispatched_at = Column(DateTime, default=datetime.datetime.utcnow)
    arrived_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="En Route")  # En Route, On Scene, Completed, Cancelled
    notes = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="dispatches")
    resource = relationship("Resource", back_populates="dispatches")


# ──────────────────────────────────────────────────────────────────────────────
# SHELTERS
# ──────────────────────────────────────────────────────────────────────────────

class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)     # Community Centre, School, Stadium, etc.
    address = Column(String(512), nullable=True)
    district = Column(String(100), nullable=True)
    zone = Column(String(100), nullable=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Capacity
    total_capacity = Column(Integer, default=0)
    current_occupancy = Column(Integer, default=0)

    # Status
    status = Column(String(30), default="Standby")  # Active, Standby, Full, Closed
    is_wheelchair_accessible = Column(Boolean, default=False)
    has_medical_facility = Column(Boolean, default=False)
    has_food_supply = Column(Boolean, default=False)
    has_water_supply = Column(Boolean, default=True)
    has_power_backup = Column(Boolean, default=False)

    # Contact
    manager_name = Column(String(255), nullable=True)
    manager_phone = Column(String(20), nullable=True)

    opened_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# HOSPITALS
# ──────────────────────────────────────────────────────────────────────────────

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=True)       # Government, Private, Trauma Centre
    address = Column(String(512), nullable=True)
    district = Column(String(100), nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    total_beds = Column(Integer, default=0)
    available_beds = Column(Integer, default=0)
    icu_beds = Column(Integer, default=0)
    icu_available = Column(Integer, default=0)
    trauma_bays = Column(Integer, default=0)

    has_blood_bank = Column(Boolean, default=False)
    has_dialysis = Column(Boolean, default=False)
    has_ventilators = Column(Boolean, default=False)
    ventilator_count = Column(Integer, default=0)

    phone = Column(String(20), nullable=True)
    emergency_phone = Column(String(20), nullable=True)
    status = Column(String(30), default="Operational")  # Operational, Limited, Overwhelmed, Closed

    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ──────────────────────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    title = Column(String(512), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String(50), default="Info")       # Info, Warning, Critical, SOS, Broadcast

    # Targeting
    target_type = Column(String(20), default="user")  # user, role, all
    target_role = Column(String(50), nullable=True)
    channels = Column(String(100), default="push,web")  # push, web, sms

    # Incident link
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)

    # Status
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    # FCM message ID
    fcm_message_id = Column(String(255), nullable=True)

    user = relationship("User", back_populates="notifications")


# ──────────────────────────────────────────────────────────────────────────────
# ANALYTICS SNAPSHOTS
# ──────────────────────────────────────────────────────────────────────────────

class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_type = Column(String(50), nullable=False)    # hourly, daily, weekly, monthly
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False)

    # Incident metrics
    total_incidents = Column(Integer, default=0)
    resolved_incidents = Column(Integer, default=0)
    avg_response_time = Column(Float, default=0.0)        # minutes
    avg_resolution_time = Column(Float, default=0.0)      # minutes

    # Type breakdown (JSON)
    incident_by_type = Column(Text, nullable=True)        # {"Fire": 5, "Flood": 2}
    incident_by_severity = Column(Text, nullable=True)
    incident_by_zone = Column(Text, nullable=True)

    # Resource metrics
    total_dispatches = Column(Integer, default=0)
    resource_utilization = Column(Float, default=0.0)     # 0–100

    # People metrics
    total_victims_helped = Column(Integer, default=0)
    total_evacuated = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# AI PREDICTIONS
# ──────────────────────────────────────────────────────────────────────────────

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_type = Column(String(100), nullable=False)  # flood, fire, earthquake, crowd

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(255), nullable=True)
    district = Column(String(100), nullable=True)

    risk_level = Column(String(20), nullable=False)        # Low, Moderate, High, Critical
    probability = Column(Float, default=0.0)               # 0.0 – 1.0
    confidence = Column(Float, default=0.0)                # 0.0 – 1.0

    factors = Column(Text, nullable=True)                  # JSON: {"rainfall": 45, "wind": 12}
    recommendations = Column(Text, nullable=True)          # JSON array of action strings
    affected_area_km2 = Column(Float, nullable=True)
    affected_population = Column(Integer, nullable=True)

    valid_from = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    superseded_by = Column(Integer, ForeignKey("predictions.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# AUDIT LOGS
# ──────────────────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False)           # create_incident, dispatch_vehicle, etc.
    resource_type = Column(String(100), nullable=True)     # incident, user, resource, shelter
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)                  # JSON of changed fields
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# ──────────────────────────────────────────────────────────────────────────────
# SIMULATIONS
# ──────────────────────────────────────────────────────────────────────────────

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100), nullable=False)    # Fire, Flood, Building Collapse, Stampede
    status = Column(String(20), default="Idle")  # Idle, Running, Paused, Completed
    parameters = Column(Text, nullable=True)     # JSON
    result_summary = Column(Text, nullable=True) # JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# BROADCASTS
# ──────────────────────────────────────────────────────────────────────────────

class Broadcast(Base):
    __tablename__ = "broadcasts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(512), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), default="General")    # General, Alert, Emergency, All Clear
    severity = Column(String(20), default="Info")   # Info, Warning, Critical
    channel = Column(String(100), default="web")    # web, push, sms, all
    target_audience = Column(String(100), default="all")  # all, citizens, responders, admins

    # Geographic targeting
    target_district = Column(String(100), nullable=True)
    target_zone = Column(String(100), nullable=True)

    # Status
    status = Column(String(20), default="Pending")  # Pending, Sent, Failed
    sent_count = Column(Integer, default=0)
    read_count = Column(Integer, default=0)

    # Author
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)


# ──────────────────────────────────────────────────────────────────────────────
# POLICE STATIONS / FIRE STATIONS (Hyderabad Data)
# ──────────────────────────────────────────────────────────────────────────────

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)   # Police, Fire
    address = Column(String(512), nullable=True)
    district = Column(String(100), nullable=True)
    zone = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(20), nullable=True)
    officer_in_charge = Column(String(255), nullable=True)
    total_staff = Column(Integer, default=0)
    available_staff = Column(Integer, default=0)
    is_operational = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
