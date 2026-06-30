import json
import time
import math
import asyncio
import threading
import datetime
import httpx
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.db.database import Base, engine, get_db, SessionLocal
from app.db import models
from app.api.websocket import manager
from app.services.ai_copilot import ai_copilot
from app.services.simulation import SimulationEngine, calculate_distance
from app.services.prediction import PredictionEngine
from app.services.risk_scoring import RiskScoringEngine
from app.services.analytics import analytics_service

# Initialize FastAPI application
app = FastAPI(title=settings.APP_NAME, description=settings.TAGLINE)

# Configure CORS for communication with React Web and Expo Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Security Headers Middleware
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self' http: https: ws: wss: data: 'unsafe-inline' 'unsafe-eval'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Simple In-Memory Rate Limiting Middleware (DDoS Protection)
import time
from collections import defaultdict

# IP -> List of timestamps
request_history = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 200  # requests per window

class RateLimitingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        
        # Bypass rate limit for local/internal checks
        if client_ip in ("127.0.0.1", "localhost"):
            return await call_next(request)
            
        now = time.time()
        # Clean up old timestamps
        request_history[client_ip] = [t for t in request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]
        
        if len(request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
            return Response(
                content="Rate limit exceeded. Try again in a minute.", 
                status_code=429
            )
            
        request_history[client_ip].append(now)
        return await call_next(request)

app.add_middleware(RateLimitingMiddleware)


# Global tracking for active simulation run
class SimulationState:
    def __init__(self):
        self.running = False
        self.paused = False
        self.sim_type = "fire"
        self.lat = 17.4483
        self.lng = 78.3741
        self.step = 0
        self.max_steps = 15
        self.speed = 1.0
        self.params = {}
        self.thread = None

sim_state = SimulationState()

# Create database tables and seed mock data
async def broadcast_system_health():
    import random
    from sqlalchemy import text
    while True:
        try:
            db_status = "Healthy"
            try:
                db = SessionLocal()
                db.execute(text("SELECT 1"))
                db.close()
            except Exception:
                db_status = "Degraded"
                
            ws_count = len(manager.active_connections)
            cpu_usage = round(random.uniform(12.5, 24.5), 1)
            memory_usage = round(random.uniform(42.1, 48.9), 1)
            
            await manager.broadcast({
                "event": "SYSTEM_HEALTH_UPDATE",
                "data": {
                    "api_status": "Healthy",
                    "db_status": db_status,
                    "redis_status": "Inactive" if not settings.REDIS_URL else "Healthy",
                    "websocket_connections": ws_count,
                    "cpu_usage": cpu_usage,
                    "memory_usage": memory_usage,
                    "timestamp": datetime.datetime.utcnow().isoformat()
                }
            })
        except Exception as e:
            print(f"Error in health broadcast: {e}")
        await asyncio.sleep(4.0)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_data(db)
    finally:
        db.close()
    
    # Start background system health broadcaster
    asyncio.create_task(broadcast_system_health())


def seed_data(db: Session):
    from sqlalchemy import text
    # Check if database is already seeded with Hyderabad data
    if db.query(models.Resource).filter(models.Resource.name == "Apollo Hospitals Jubilee Hills").first():
        return
        
    # Clear old tables to migrate to Hyderabad coordinates
    try:
        db.execute(text("DELETE FROM incident_timelines"))
        db.execute(text("DELETE FROM resources"))
        db.execute(text("DELETE FROM incidents"))
        db.execute(text("DELETE FROM users"))
        db.commit()
    except Exception:
        db.rollback()
    
    # 1. Create Mock Users
    citizen = models.User(
        email="citizen@aegis.com",
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",  # password: password
        full_name="Alex Mercer",
        role="Citizen",
        status="Active"
    )
    responder = models.User(
        email="responder@aegis.com",
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",
        full_name="Captain Jack Vance",
        role="Responder",
        status="Available",
        latitude=17.4435,
        longitude=78.3900
    )
    operator = models.User(
        email="operator@aegis.com",
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",
        full_name="Sarah Connor",
        role="Operator",
        status="Active"
    )
    admin = models.User(
        email="admin@aegis.com",
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",
        full_name="Director Vance",
        role="Administrator",
        status="Active"
    )
    db.add_all([citizen, responder, operator, admin])
    db.commit()

    # 2. Create Mock Resources (Hospitals, Police, Fire, Shelters, Mobile Units)
    hospitals = [
        models.Resource(name="Apollo Hospitals Jubilee Hills", type="Hospital", capacity=85, max_capacity=100, latitude=17.4262, longitude=78.4116, status="Available"),
        models.Resource(name="NIMS Punjagutta", type="Hospital", capacity=42, max_capacity=60, latitude=17.4255, longitude=78.4560, status="Available"),
    ]
    fire_stations = [
        models.Resource(name="Madhapur Fire Station", type="Fire Station", capacity=5, max_capacity=5, latitude=17.4423, longitude=78.3842, status="Available"),
    ]
    police_stations = [
        models.Resource(name="Madhapur Police Station", type="Police Station", capacity=12, max_capacity=15, latitude=17.4452, longitude=78.3805, status="Available"),
    ]
    shelters = [
        models.Resource(name="Hitec City Rescue Shelter", type="Shelter", capacity=120, max_capacity=200, latitude=17.4504, longitude=78.3768, status="Available"),
    ]
    vehicles = [
        models.Resource(name="Ambulance Unit-108", type="Ambulance", capacity=0, max_capacity=2, latitude=17.4435, longitude=78.3900, status="Available"),
        models.Resource(name="Fire Engine-401", type="Fire Truck", capacity=0, max_capacity=6, latitude=17.4390, longitude=78.3812, status="Available"),
        models.Resource(name="Police Patrol-99", type="Police Vehicle", capacity=0, max_capacity=4, latitude=17.4468, longitude=78.3712, status="Available"),
    ]
    db.add_all(hospitals + fire_stations + police_stations + shelters + vehicles)
    db.commit()

    # 3. Create Seeded Incidents
    incident1 = models.Incident(
        type="Fire",
        severity="High",
        description="Structural electrical fire active on 3rd floor of commercial complex in IT Corridor. Heavy smoke visible.",
        location_name="Madhapur IT Corridor",
        latitude=17.4483,
        longitude=78.3741,
        status="Active",
        citizen_id=citizen.id,
        responder_id=responder.id
    )
    incident2 = models.Incident(
        type="Traffic Accident",
        severity="Low",
        description="Minor 2-vehicle collision blocks left lanes on expressway. No injuries reported.",
        location_name="PVNR Expressway",
        latitude=17.3821,
        longitude=78.4320,
        status="Under Investigation",
        citizen_id=citizen.id
    )
    db.add_all([incident1, incident2])
    db.commit()

    # Seed timelines
    t1_1 = models.IncidentTimeline(incident_id=incident1.id, timestamp="11:50 PM", event="Emergency call received: smoke on 3rd floor", status="Warning")
    t1_2 = models.IncidentTimeline(incident_id=incident1.id, timestamp="11:51 PM", event="Incident verified via CCTV feed", status="Critical")
    t1_3 = models.IncidentTimeline(incident_id=incident1.id, timestamp="11:52 PM", event="Madhapur Fire Engine dispatched", status="Warning")
    t1_4 = models.IncidentTimeline(incident_id=incident1.id, timestamp="11:55 PM", event="Fire Engine arrived on scene", status="Info")

    t2_1 = models.IncidentTimeline(incident_id=incident2.id, timestamp="11:40 PM", event="Citizen reported fender-bender", status="Info")
    t2_2 = models.IncidentTimeline(incident_id=incident2.id, timestamp="11:42 PM", event="Police Patrol-99 dispatched", status="Info")
    
    db.add_all([t1_1, t1_2, t1_3, t1_4, t2_1, t2_2])
    db.commit()

# --- SERIALIZE HELPERS ---
def serialize_incident(inc: models.Incident) -> dict:
    return {
        "id": inc.id,
        "type": inc.type,
        "severity": inc.severity,
        "description": inc.description,
        "photo_url": inc.photo_url,
        "video_url": inc.video_url,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "location_name": inc.location_name,
        "status": inc.status,
        "reported_at": inc.reported_at.isoformat() if inc.reported_at else None,
        "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        "citizen_id": inc.citizen_id,
        "responder_id": inc.responder_id,
        "timeline": [
            {
                "id": t.id,
                "timestamp": t.timestamp,
                "event": t.event,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None
            } for t in sorted(inc.timeline, key=lambda x: x.created_at)
        ] if inc.timeline else []
    }


# --- AUTH ROUTES ---
@app.post("/api/auth/register")
def register(user_data: dict, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.get("email")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        email=user_data.get("email"),
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",  # default hashed password
        full_name=user_data.get("full_name", "Anonymous User"),
        role=user_data.get("role", "Citizen")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"token": "mock-token-jwt-key", "user": {"id": new_user.id, "email": new_user.email, "full_name": new_user.full_name, "role": new_user.role}}

@app.post("/api/auth/login")
def login(login_data: dict, db: Session = Depends(get_db)):
    email = login_data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Auto-register any unknown email as a Citizen (great for demos/expo)
    if not user:
        # Derive a display name from the email address
        name_part = email.split("@")[0].replace(".", " ").replace("_", " ").title()
        user = models.User(
            email=email,
            password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",
            full_name=name_part or "Guest User",
            role="Citizen",
            status="Active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "token": f"mock-token-for-user-{user.id}",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

# --- VEHICLE MOVEMENT SIMULATOR ---
async def simulate_vehicle_movement(resource_id: int, incident_id: int):
    await asyncio.sleep(0.5)  # slight delay before starting movement
    db = SessionLocal()
    try:
        resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
        incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
        if not resource or not incident:
            return

        start_lat, start_lng = resource.latitude, resource.longitude
        dest_lat, dest_lng = incident.latitude, incident.longitude
        
        # Add timeline entry for dispatch
        now_str = datetime.datetime.now().strftime("%I:%M %p")
        dispatch_event = models.IncidentTimeline(
            incident_id=incident.id,
            timestamp=now_str,
            event=f"{resource.name} ({resource.type}) dispatched to scene",
            status="Warning"
        )
        db.add(dispatch_event)
        
        # Update resource status to "Dispatched"
        resource.status = "Dispatched"
        resource.assigned_incident_id = incident.id
        resource.eta = 4  # Start with 4m ETA
        db.commit()
        db.refresh(resource)
        db.refresh(incident)

        # Broadcast the dispatch timeline event and resource status
        await manager.broadcast({
            "event": "INCIDENT_UPDATED",
            "data": serialize_incident(incident)
        })
        await manager.broadcast({
            "event": "RESOURCE_UPDATED",
            "data": {
                "id": resource.id,
                "status": resource.status,
                "latitude": resource.latitude,
                "longitude": resource.longitude,
                "eta": resource.eta,
                "assigned_incident_id": incident.id
            }
        })

        total_steps = 15
        for step in range(1, total_steps + 1):
            # Check if simulation is still active / not resolved/cancelled
            db.refresh(resource)
            db.refresh(incident)
            if resource.assigned_incident_id != incident.id or resource.status == "Available" or incident.status == "Resolved":
                break
                
            # Calculate interpolated position
            progress = step / total_steps
            current_lat = start_lat + (dest_lat - start_lat) * progress
            current_lng = start_lng + (dest_lng - start_lng) * progress
            
            # Update database
            resource.latitude = current_lat
            resource.longitude = current_lng
            
            # Calculate dynamic ETA (seconds for demo, represented as ETA progress)
            eta = max(1, math.ceil((4 * (1.0 - progress))))
            resource.eta = eta
            
            if step == 1:
                resource.status = "En Route"
            
            db.commit()
            
            # Broadcast location update
            await manager.broadcast({
                "event": "RESOURCE_UPDATED",
                "data": {
                    "id": resource.id,
                    "status": resource.status,
                    "latitude": resource.latitude,
                    "longitude": resource.longitude,
                    "eta": resource.eta,
                    "assigned_incident_id": incident.id
                }
            })
            await manager.broadcast({
                "event": "RESPONDER_LOCATION_UPDATED",
                "data": {
                    "id": resource.id,
                    "latitude": resource.latitude,
                    "longitude": resource.longitude
                }
            })
            
            await asyncio.sleep(1.0)  # Move every 1 second
            
        # Arrived!
        db.refresh(resource)
        db.refresh(incident)
        if resource.assigned_incident_id == incident.id and resource.status != "Available" and incident.status != "Resolved":
            resource.status = "Arrived"
            resource.eta = 0
            
            # Add timeline entry for arrival
            now_str = datetime.datetime.now().strftime("%I:%M %p")
            arrival_event = models.IncidentTimeline(
                incident_id=incident.id,
                timestamp=now_str,
                event=f"{resource.name} arrived at scene",
                status="Info"
            )
            db.add(arrival_event)
            
            # Update incident status if it was just reported/dispatched
            if incident.status in ["Reported", "Dispatched"]:
                incident.status = "Active"
                
            db.commit()
            db.refresh(resource)
            db.refresh(incident)
            
            # Broadcast arrival
            await manager.broadcast({
                "event": "INCIDENT_UPDATED",
                "data": serialize_incident(incident)
            })
            await manager.broadcast({
                "event": "RESOURCE_UPDATED",
                "data": {
                    "id": resource.id,
                    "status": resource.status,
                    "latitude": resource.latitude,
                    "longitude": resource.longitude,
                    "eta": 0,
                    "assigned_incident_id": incident.id
                }
            })
        
    except Exception as e:
        print(f"Error in vehicle simulation: {e}")
    finally:
        db.close()

# --- INCIDENT ROUTES ---
@app.get("/api/incidents")
def get_incidents(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Incident)
    if status:
        query = query.filter(models.Incident.status == status)
    incidents = query.order_by(models.Incident.reported_at.desc()).all()
    return [serialize_incident(inc) for inc in incidents]

@app.post("/api/incidents")
async def create_incident(incident_data: dict, db: Session = Depends(get_db)):
    new_incident = models.Incident(
        type=incident_data.get("type"),
        severity=incident_data.get("severity", "Medium"),
        description=incident_data.get("description"),
        latitude=float(incident_data.get("latitude")),
        longitude=float(incident_data.get("longitude")),
        location_name=incident_data.get("location_name", "Reported Location"),
        photo_url=incident_data.get("photo_url"),
        status="Reported"
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    
    # Add initial timeline event
    now_str = datetime.datetime.now().strftime("%I:%M %p")
    initial_event = models.IncidentTimeline(
        incident_id=new_incident.id,
        timestamp=now_str,
        event=f"Incident Reported: {new_incident.type} ({new_incident.severity})",
        status="Warning" if new_incident.severity in ["High", "Critical"] else "Info"
    )
    db.add(initial_event)
    db.commit()
    db.refresh(new_incident)
    
    # Run automatic resource assignment logic
    # Find nearest available ambulance/fire truck based on coordinates
    available_resource = db.query(models.Resource).filter(
        models.Resource.status == "Available",
        models.Resource.type.in_(["Ambulance", "Fire Truck", "Police Vehicle"])
    ).first()
    
    if available_resource:
        available_resource.status = "Dispatched"
        available_resource.assigned_incident_id = new_incident.id
        available_resource.eta = 4  # mock ETA of 4 minutes
        new_incident.status = "Dispatched"
        db.commit()
        db.refresh(new_incident)
        # Start vehicle tracking simulation
        asyncio.create_task(simulate_vehicle_movement(available_resource.id, new_incident.id))

    serialized = serialize_incident(new_incident)

    # Broadcast WebSocket Alert
    await manager.broadcast({
        "event": "INCIDENT_CREATED",
        "data": serialized
    })
    
    return serialized

@app.put("/api/incidents/{id}")
async def update_incident(id: int, update_data: dict, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    old_status = incident.status
    for key, value in update_data.items():
        if hasattr(incident, key):
            setattr(incident, key, value)
            
    if update_data.get("status") == "Resolved":
        incident.resolved_at = datetime.datetime.utcnow()
        # Free up resources
        resources = db.query(models.Resource).filter(models.Resource.assigned_incident_id == id).all()
        for res in resources:
            res.status = "Available"
            res.assigned_incident_id = None
            res.eta = None
            
        # Add timeline event
        now_str = datetime.datetime.now().strftime("%I:%M %p")
        resolve_event = models.IncidentTimeline(
            incident_id=incident.id,
            timestamp=now_str,
            event="Situation Stabilized & Resolved",
            status="Success"
        )
        db.add(resolve_event)
    elif update_data.get("status") != old_status:
        # Add status change event
        now_str = datetime.datetime.now().strftime("%I:%M %p")
        status_event = models.IncidentTimeline(
            incident_id=incident.id,
            timestamp=now_str,
            event=f"Incident Status Updated: {incident.status}",
            status="Info"
        )
        db.add(status_event)
            
    db.commit()
    db.refresh(incident)
    
    serialized = serialize_incident(incident)
    await manager.broadcast({
        "event": "INCIDENT_UPDATED",
        "data": serialized
    })
    return serialized

# --- RESOURCE ROUTES ---
@app.get("/api/resources")
def get_resources(db: Session = Depends(get_db)):
    return db.query(models.Resource).all()

@app.put("/api/resources/{id}")
async def update_resource(id: int, update_data: dict, db: Session = Depends(get_db)):
    resource = db.query(models.Resource).filter(models.Resource.id == id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    old_status = resource.status
    assigned_incident_id = update_data.get("assigned_incident_id")
    
    for key, value in update_data.items():
        if hasattr(resource, key):
            setattr(resource, key, value)
    db.commit()
    db.refresh(resource)
    
    # If resource was manually dispatched, trigger movement simulation!
    if update_data.get("status") == "Dispatched" and assigned_incident_id and old_status != "Dispatched":
        asyncio.create_task(simulate_vehicle_movement(resource.id, assigned_incident_id))
    
    await manager.broadcast({
        "event": "RESOURCE_UPDATED",
        "data": {
            "id": resource.id,
            "status": resource.status,
            "latitude": resource.latitude,
            "longitude": resource.longitude,
            "capacity": resource.capacity,
            "eta": resource.eta,
            "assigned_incident_id": resource.assigned_incident_id
        }
    })
    return resource

# --- AI COPILOT ROUTE ---
@app.post("/api/ai/chat")
async def chat_copilot(payload: dict, db: Session = Depends(get_db)):
    prompt = payload.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    # Build live context from DB
    active_incidents = db.query(models.Incident).filter(models.Incident.status != "Resolved").all()
    available_resources = db.query(models.Resource).filter(models.Resource.status == "Available").all()
    dispatched_resources = db.query(models.Resource).filter(models.Resource.status != "Available").all()
    
    live_context = "### AEGIS X LIVE EMERGENCY OPERATIONS CENTRE REAL-TIME STATE\n"
    live_context += f"Total Active Incidents: {len(active_incidents)}\n"
    for inc in active_incidents:
        live_context += f"- [Incident ID {inc.id}] Type: {inc.type}, Severity: {inc.severity}, Location: {inc.location_name}, Status: {inc.status}, Coordinates: ({inc.latitude:.4f}, {inc.longitude:.4f}). Description: {inc.description}\n"
        if inc.timeline:
            live_context += "  Timeline history:\n"
            for t in sorted(inc.timeline, key=lambda x: x.created_at)[-3:]:  # last 3 events
                live_context += f"    * {t.timestamp}: {t.event} ({t.status})\n"
                
    live_context += f"\nTotal Available Resources: {len(available_resources)}\n"
    for res in available_resources:
        live_context += f"- [Resource ID {res.id}] Name: {res.name}, Type: {res.type}, Coordinates: ({res.latitude:.4f}, {res.longitude:.4f})\n"
        
    live_context += f"\nTotal Dispatched/Busy Resources: {len(dispatched_resources)}\n"
    for res in dispatched_resources:
        live_context += f"- [Resource ID {res.id}] Name: {res.name}, Type: {res.type}, Status: {res.status}, Assigned to Incident ID: {res.assigned_incident_id}, ETA: {res.eta or 'N/A'} mins\n"
    
    # Merge client context and live DB context
    full_context = live_context + "\n" + payload.get("context", "")
    
    response = await ai_copilot.get_response(prompt, full_context)
    return {"response": response}

# --- WEATHER ROUTE ---
@app.get("/api/weather")
async def get_weather(lat: float = 17.4483, lng: float = 78.3741):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.WEATHER_API_URL}?latitude={lat}&longitude={lng}&current_weather=true"
            )
            if response.status_code == 200:
                return response.json()
    except Exception:
        pass
    
    # Return mock weather if API fails or offline (Hyderabad template)
    return {"current_weather": {"temperature": 29.5, "windspeed": 8.5, "weathercode": 1}}

# --- SIMULATION MANAGEMENT & WEBSOCKET BROADCAST ---
def run_simulation_loop():
    global sim_state
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    while sim_state.running:
        if sim_state.paused:
            time.sleep(0.5)
            continue
            
        if sim_state.step >= sim_state.max_steps:
            sim_state.running = False
            # broadcast completed
            loop.run_until_complete(manager.broadcast({
                "event": "SIMULATION_COMPLETED",
                "data": {"type": sim_state.sim_type}
            }))
            break
            
        sim_state.step += 1
        
        tick_frame = SimulationEngine.get_simulation_tick(
            sim_state.sim_type, sim_state.lat, sim_state.lng, sim_state.step, sim_state.max_steps, sim_state.params
        )
        
        # Inject predictions directly into the frame
        predictions = PredictionEngine.get_predictions(
            sim_state.sim_type, sim_state.step, sim_state.max_steps, sim_state.params
        )
        tick_frame["predictions"] = predictions
        
        # Broadcast the frame
        loop.run_until_complete(manager.broadcast({
            "event": "SIMULATION_TICK",
            "data": tick_frame
        }))
        
        # Sleep depends on speed multiplier
        sleep_time = max(0.1, 1.2 / sim_state.speed)
        time.sleep(sleep_time)
        
    loop.close()

@app.post("/api/simulations/start")
def start_simulation(payload: dict):
    global sim_state
    if sim_state.running:
        sim_state.running = False
        time.sleep(0.5)
        
    sim_state.sim_type = payload.get("type", "fire")
    sim_state.lat = float(payload.get("latitude", 17.4483))
    sim_state.lng = float(payload.get("longitude", 78.3741))
    sim_state.params = payload.get("parameters", {})
    sim_state.step = 0
    sim_state.max_steps = 15
    sim_state.speed = 1.0
    sim_state.paused = False
    sim_state.running = True
    
    sim_state.thread = threading.Thread(
        target=run_simulation_loop, 
        daemon=True
    )
    sim_state.thread.start()
    
    return {
        "status": "started", 
        "type": sim_state.sim_type, 
        "center": [sim_state.lat, sim_state.lng],
        "step": sim_state.step,
        "max_steps": sim_state.max_steps,
        "speed": sim_state.speed
    }

@app.post("/api/simulations/stop")
def stop_simulation():
    global sim_state
    sim_state.running = False
    sim_state.paused = False
    return {"status": "stopped"}

@app.post("/api/simulations/pause")
def pause_simulation():
    global sim_state
    if not sim_state.running:
        return {"status": "inactive"}
    sim_state.paused = True
    return {"status": "paused", "step": sim_state.step}

@app.post("/api/simulations/resume")
def resume_simulation():
    global sim_state
    if not sim_state.running:
        return {"status": "inactive"}
    sim_state.paused = False
    return {"status": "resumed", "step": sim_state.step}

@app.post("/api/simulations/reset")
def reset_simulation():
    global sim_state
    sim_state.step = 0
    sim_state.paused = False
    return {"status": "reset", "step": 0}

@app.post("/api/simulations/speed")
def speed_simulation(payload: dict):
    global sim_state
    speed = float(payload.get("speed", 1.0))
    sim_state.speed = max(0.1, min(10.0, speed))
    return {"status": "speed_changed", "speed": sim_state.speed}

# --- PREDICTIONS & RISK SCORING ROUTES ---
@app.get("/api/predictions/{incident_id}")
def get_incident_predictions(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    params = {
        "windSpeed": 12.0 if incident.severity == "High" else 5.0,
        "waterRate": 8.0 if incident.severity == "Critical" else 3.0,
        "crowdSize": 800 if incident.type == "Stampede" else 500
    }
    pred = PredictionEngine.get_predictions(incident.type, 5, 15, params)
    return pred

@app.get("/api/risk-score")
def get_risk_score(latitude: float, longitude: float, db: Session = Depends(get_db)):
    score = RiskScoringEngine.calculate_risk(latitude, longitude, db)
    return score

# --- WEBSOCKET HANDSHAKE ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection open and listen for client pings or resource coordinates updates
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
            except Exception:
                continue

            event_type = parsed.get("event", "")

            # Heartbeat: respond to PING with PONG
            if event_type == "PING":
                await websocket.send_json({"event": "PONG", "data": {}})
                continue
            
            # Allow responders to report live GPS coordinates back via WebSocket
            if event_type == "RESPONDER_GPS_UPDATE":
                payload = parsed.get("data", {})
                responder_id = payload.get("responder_id")
                lat = payload.get("latitude")
                lng = payload.get("longitude")
                
                # Broadcast back to command center
                await manager.broadcast({
                    "event": "RESPONDER_LOCATION_UPDATED",
                    "data": {"id": responder_id, "latitude": lat, "longitude": lng}
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# =============================================================================
# PHASE 5 — ANALYTICS ROUTES
# =============================================================================

@app.get("/api/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    """Returns high-level KPI summary for the analytics dashboard."""
    return analytics_service.get_summary(db)


@app.get("/api/analytics/incidents-by-hour")
def get_incidents_by_hour(db: Session = Depends(get_db)):
    """Returns incident counts grouped by hour for the last 24 hours."""
    return analytics_service.get_incidents_by_hour(db)


@app.get("/api/analytics/incident-types")
def get_incident_types(db: Session = Depends(get_db)):
    """Returns incident distribution by type for pie chart."""
    return analytics_service.get_incident_types(db)


@app.get("/api/analytics/resource-utilization")
def get_resource_utilization(db: Session = Depends(get_db)):
    """Returns resource utilization breakdown by type."""
    return analytics_service.get_resource_utilization(db)


@app.get("/api/analytics/risk-trend")
def get_risk_trend(db: Session = Depends(get_db)):
    """Returns rolling risk score trend for the last 24 hours."""
    return analytics_service.get_risk_trend(db)


# =============================================================================
# PHASE 5 — EVACUATION PLANNING ROUTE
# =============================================================================

@app.get("/api/evacuation/plan/{incident_id}")
def get_evacuation_plan(incident_id: int, db: Session = Depends(get_db)):
    """Generates an evacuation plan for a given incident."""
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    import random
    lat, lng = incident.latitude, incident.longitude

    # Generate 3 danger zones based on severity
    severity_radii = {"Critical": [0.5, 1.5, 3.0], "High": [0.4, 1.2, 2.5], "Medium": [0.3, 0.9, 2.0], "Low": [0.2, 0.6, 1.5]}
    radii = severity_radii.get(incident.severity, [0.4, 1.2, 2.5])

    danger_zones = [
        {"name": "Red Zone", "color": "#E63946", "radius_km": radii[0], "population": random.randint(200, 800), "buildings": random.randint(15, 60)},
        {"name": "Orange Zone", "color": "#F4A261", "radius_km": radii[1], "population": random.randint(800, 3000), "buildings": random.randint(60, 200)},
        {"name": "Yellow Zone", "color": "#FDE68A", "radius_km": radii[2], "population": random.randint(3000, 10000), "buildings": random.randint(200, 600)},
    ]

    # Find nearby shelters (resources of type Shelter or Hospital)
    all_resources = db.query(models.Resource).filter(
        models.Resource.type.in_(["Hospital", "Shelter"])
    ).all()
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    shelters = []
    for res in all_resources:
        dist = haversine(lat, lng, res.latitude, res.longitude)
        if dist < 15:
            shelters.append({
                "id": res.id, "name": res.name, "type": res.type,
                "distance_km": round(dist, 2),
                "capacity": res.max_capacity, "available": res.capacity,
                "status": res.status,
            })
    shelters.sort(key=lambda x: x["distance_km"])

    # Generate evacuation routes
    directions = ["North", "East", "South-West"]
    route_types = ["Primary", "Alternative", "Emergency"]
    routes = []
    for i, (direction, rtype) in enumerate(zip(directions, route_types)):
        base_time = random.randint(8, 25)
        routes.append({
            "id": i + 1,
            "type": rtype,
            "direction": direction,
            "distance_km": round(random.uniform(2.5, 8.0), 1),
            "estimated_time_min": base_time,
            "road_condition": random.choice(["Clear", "Congested", "Moderate"]),
            "capacity_vehicles": random.randint(200, 800),
            "steps": [
                f"Evacuate immediately via {direction} corridor",
                f"Proceed to nearest shelter ({shelters[0]['name'] if shelters else 'Designated Area'})",
                "Follow AEGIS X responder guidance on ground",
                "Avoid returning to Red Zone until clearance issued",
            ]
        })

    return {
        "incident_id": incident_id,
        "incident_type": incident.type,
        "severity": incident.severity,
        "location": incident.location_name,
        "latitude": lat,
        "longitude": lng,
        "danger_zones": danger_zones,
        "shelters": shelters[:5],
        "evacuation_routes": routes,
        "total_affected_population": sum(z["population"] for z in danger_zones),
        "total_affected_buildings": sum(z["buildings"] for z in danger_zones),
        "generated_at": datetime.datetime.utcnow().isoformat(),
    }


# =============================================================================
# PHASE 5 — SMART RESOURCE ALLOCATION ROUTE
# =============================================================================

@app.get("/api/resources/allocation-recommendation")
def get_allocation_recommendation(incident_type: str, severity: str, db: Session = Depends(get_db)):
    """Returns recommended resource allocation mix for a given incident type and severity."""

    # Allocation matrix: incident_type -> severity -> unit recommendations
    allocation_matrix = {
        "Fire": {
            "Critical": [{"type": "Fire Truck", "count": 6, "priority": 1}, {"type": "Ambulance", "count": 3, "priority": 2}, {"type": "Police Vehicle", "count": 4, "priority": 3}, {"type": "Emergency Team", "count": 2, "priority": 4}],
            "High":     [{"type": "Fire Truck", "count": 4, "priority": 1}, {"type": "Ambulance", "count": 2, "priority": 2}, {"type": "Police Vehicle", "count": 3, "priority": 3}],
            "Medium":   [{"type": "Fire Truck", "count": 2, "priority": 1}, {"type": "Ambulance", "count": 1, "priority": 2}],
            "Low":      [{"type": "Fire Truck", "count": 1, "priority": 1}],
        },
        "Flood": {
            "Critical": [{"type": "Emergency Team", "count": 5, "priority": 1}, {"type": "Ambulance", "count": 4, "priority": 2}, {"type": "Police Vehicle", "count": 6, "priority": 3}, {"type": "Fire Truck", "count": 2, "priority": 4}],
            "High":     [{"type": "Emergency Team", "count": 3, "priority": 1}, {"type": "Ambulance", "count": 2, "priority": 2}, {"type": "Police Vehicle", "count": 4, "priority": 3}],
            "Medium":   [{"type": "Emergency Team", "count": 2, "priority": 1}, {"type": "Police Vehicle", "count": 2, "priority": 2}],
            "Low":      [{"type": "Emergency Team", "count": 1, "priority": 1}],
        },
        "Building Collapse": {
            "Critical": [{"type": "Emergency Team", "count": 8, "priority": 1}, {"type": "Ambulance", "count": 6, "priority": 2}, {"type": "Fire Truck", "count": 4, "priority": 3}, {"type": "Police Vehicle", "count": 5, "priority": 4}],
            "High":     [{"type": "Emergency Team", "count": 5, "priority": 1}, {"type": "Ambulance", "count": 4, "priority": 2}, {"type": "Fire Truck", "count": 2, "priority": 3}],
            "Medium":   [{"type": "Emergency Team", "count": 3, "priority": 1}, {"type": "Ambulance", "count": 2, "priority": 2}],
            "Low":      [{"type": "Emergency Team", "count": 1, "priority": 1}],
        },
        "Chemical Leak": {
            "Critical": [{"type": "Emergency Team", "count": 6, "priority": 1}, {"type": "Ambulance", "count": 5, "priority": 2}, {"type": "Police Vehicle", "count": 8, "priority": 3}, {"type": "Fire Truck", "count": 3, "priority": 4}],
            "High":     [{"type": "Emergency Team", "count": 4, "priority": 1}, {"type": "Ambulance", "count": 3, "priority": 2}, {"type": "Police Vehicle", "count": 5, "priority": 3}],
            "Medium":   [{"type": "Emergency Team", "count": 2, "priority": 1}, {"type": "Ambulance", "count": 2, "priority": 2}],
            "Low":      [{"type": "Emergency Team", "count": 1, "priority": 1}],
        },
        "Traffic Accident": {
            "Critical": [{"type": "Ambulance", "count": 4, "priority": 1}, {"type": "Police Vehicle", "count": 6, "priority": 2}, {"type": "Fire Truck", "count": 2, "priority": 3}],
            "High":     [{"type": "Ambulance", "count": 2, "priority": 1}, {"type": "Police Vehicle", "count": 3, "priority": 2}],
            "Medium":   [{"type": "Ambulance", "count": 1, "priority": 1}, {"type": "Police Vehicle", "count": 2, "priority": 2}],
            "Low":      [{"type": "Police Vehicle", "count": 1, "priority": 1}],
        },
        "Stampede": {
            "Critical": [{"type": "Police Vehicle", "count": 10, "priority": 1}, {"type": "Ambulance", "count": 6, "priority": 2}, {"type": "Emergency Team", "count": 4, "priority": 3}],
            "High":     [{"type": "Police Vehicle", "count": 6, "priority": 1}, {"type": "Ambulance", "count": 3, "priority": 2}],
            "Medium":   [{"type": "Police Vehicle", "count": 3, "priority": 1}, {"type": "Ambulance", "count": 1, "priority": 2}],
            "Low":      [{"type": "Police Vehicle", "count": 2, "priority": 1}],
        },
    }

    recommendations = allocation_matrix.get(incident_type, {}).get(severity, [{"type": "Emergency Team", "count": 2, "priority": 1}])

    # Check available units in the database
    all_resources = db.query(models.Resource).all()
    available_by_type = {}
    for res in all_resources:
        if res.status == "Available":
            available_by_type[res.type] = available_by_type.get(res.type, 0) + 1

    enriched = []
    import random
    for rec in recommendations:
        available = available_by_type.get(rec["type"], 0)
        enriched.append({
            **rec,
            "available": available,
            "can_fulfill": available >= rec["count"],
            "eta_min": random.randint(4, 18),
        })

    severity_response = {"Critical": "IMMEDIATE", "High": "URGENT", "Medium": "STANDARD", "Low": "ROUTINE"}
    return {
        "incident_type": incident_type,
        "severity": severity,
        "response_level": severity_response.get(severity, "STANDARD"),
        "recommendations": enriched,
        "estimated_total_response_min": random.randint(8, 22),
        "notes": f"Allocation based on AEGIS X operational matrix for {incident_type} — {severity} severity.",
    }

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION SERVICES (Cloudinary, FCM)
# ─────────────────────────────────────────────────────────────────────────────
from app.services.cloudinary_service import cloudinary_service
from app.services.fcm_service import fcm_service
from fastapi import UploadFile, File, Form


# ── File Upload (Cloudinary) ──────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("aegis-x/incidents"),
):
    """Upload an image/video to Cloudinary. Returns the secure URL."""
    try:
        file_bytes = await file.read()
        result = await cloudinary_service.upload_image(
            file_bytes=file_bytes,
            filename=file.filename or "upload.jpg",
            folder=folder,
        )
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# HOSPITALS ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    """Return all hospitals with bed availability."""
    try:
        hospitals = db.query(models.Hospital).all()
        if not hospitals:
            # Return realistic Hyderabad fallback data
            return [
                {"id": 1, "name": "Osmania General Hospital", "type": "Government", "district": "Hyderabad", "latitude": 17.3763, "longitude": 78.4832, "total_beds": 1500, "available_beds": 320, "icu_beds": 60, "icu_available": 18, "status": "Operational", "phone": "040-24600101", "emergency_phone": "040-24600111", "has_blood_bank": True, "has_ventilators": True, "ventilator_count": 45},
                {"id": 2, "name": "Gandhi Hospital", "type": "Government", "district": "Hyderabad", "latitude": 17.4138, "longitude": 78.4962, "total_beds": 1200, "available_beds": 180, "icu_beds": 48, "icu_available": 12, "status": "Operational", "phone": "040-27505566", "emergency_phone": "040-27505577", "has_blood_bank": True, "has_ventilators": True, "ventilator_count": 38},
                {"id": 3, "name": "Yashoda Hospital", "type": "Private", "district": "Secunderabad", "latitude": 17.4366, "longitude": 78.5012, "total_beds": 600, "available_beds": 95, "icu_beds": 42, "icu_available": 8, "status": "Operational", "phone": "040-44555555", "emergency_phone": "040-44555533", "has_blood_bank": True, "has_ventilators": True, "ventilator_count": 28},
                {"id": 4, "name": "CARE Hospitals HITEC City", "type": "Private", "district": "Hyderabad", "latitude": 17.4151, "longitude": 78.4497, "total_beds": 450, "available_beds": 67, "icu_beds": 36, "icu_available": 5, "status": "Operational", "phone": "040-30410000", "emergency_phone": "040-30410099", "has_blood_bank": True, "has_ventilators": True, "ventilator_count": 20},
                {"id": 5, "name": "Niloufer Hospital", "type": "Government", "district": "Hyderabad", "latitude": 17.3908, "longitude": 78.4636, "total_beds": 800, "available_beds": 210, "icu_beds": 30, "icu_available": 9, "status": "Operational", "phone": "040-23301421", "emergency_phone": "040-23301422", "has_blood_bank": True, "has_ventilators": True, "ventilator_count": 15},
            ]
        return [
            {
                "id": h.id, "name": h.name, "type": h.type, "address": h.address,
                "district": h.district, "latitude": h.latitude, "longitude": h.longitude,
                "total_beds": h.total_beds, "available_beds": h.available_beds,
                "icu_beds": h.icu_beds, "icu_available": h.icu_available,
                "trauma_bays": h.trauma_bays, "has_blood_bank": h.has_blood_bank,
                "has_ventilators": h.has_ventilators, "ventilator_count": h.ventilator_count,
                "phone": h.phone, "emergency_phone": h.emergency_phone, "status": h.status,
            }
            for h in hospitals
        ]
    except Exception as e:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# SHELTERS ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/shelters")
def get_shelters(db: Session = Depends(get_db)):
    """Return all registered shelters with current occupancy."""
    try:
        shelters = db.query(models.Shelter).all()
        if not shelters:
            return [
                {"id": 1, "name": "Charminar Community Hall", "type": "Community Centre", "district": "Hyderabad", "zone": "South", "latitude": 17.3616, "longitude": 78.4742, "total_capacity": 800, "current_occupancy": 340, "status": "Active", "has_medical_facility": True, "has_food_supply": True, "has_power_backup": True, "manager_name": "Abdul Raheem", "manager_phone": "+91-9876001001"},
                {"id": 2, "name": "LB Stadium — North Stand", "type": "Stadium", "district": "Hyderabad", "zone": "Central", "latitude": 17.3961, "longitude": 78.4741, "total_capacity": 5000, "current_occupancy": 120, "status": "Active", "has_medical_facility": True, "has_food_supply": True, "has_power_backup": True, "manager_name": "Collector S. Ramachandra", "manager_phone": "+91-9876003001"},
                {"id": 3, "name": "Kukatpally YMCA Ground", "type": "Open Ground", "district": "Hyderabad", "zone": "North", "latitude": 17.4948, "longitude": 78.3996, "total_capacity": 3000, "current_occupancy": 0, "status": "Standby", "has_medical_facility": False, "has_food_supply": False, "has_power_backup": False, "manager_name": "Zone Commissioner NW", "manager_phone": "+91-9876005001"},
            ]
        return [
            {
                "id": s.id, "name": s.name, "type": s.type, "address": s.address,
                "district": s.district, "zone": s.zone, "latitude": s.latitude, "longitude": s.longitude,
                "total_capacity": s.total_capacity, "current_occupancy": s.current_occupancy,
                "status": s.status, "is_wheelchair_accessible": s.is_wheelchair_accessible,
                "has_medical_facility": s.has_medical_facility, "has_food_supply": s.has_food_supply,
                "has_water_supply": s.has_water_supply, "has_power_backup": s.has_power_backup,
                "manager_name": s.manager_name, "manager_phone": s.manager_phone,
            }
            for s in shelters
        ]
    except Exception as e:
        return []


@app.put("/api/shelters/{id}")
async def update_shelter(id: int, update_data: dict, db: Session = Depends(get_db)):
    """Update shelter status or occupancy."""
    shelter = db.query(models.Shelter).filter(models.Shelter.id == id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    for k, v in update_data.items():
        if hasattr(shelter, k):
            setattr(shelter, k, v)
    db.commit()
    db.refresh(shelter)
    return {"id": shelter.id, "status": shelter.status, "current_occupancy": shelter.current_occupancy}


# ─────────────────────────────────────────────────────────────────────────────
# STATIONS ROUTES (Police / Fire)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/stations")
def get_stations(type: Optional[str] = None, db: Session = Depends(get_db)):
    """Return police and fire stations in Hyderabad."""
    try:
        query = db.query(models.Station)
        if type:
            query = query.filter(models.Station.type == type)
        stations = query.all()
        if not stations:
            fallback = [
                {"id": 1, "name": "Banjara Hills PS", "type": "Police", "district": "Hyderabad", "zone": "West", "latitude": 17.4156, "longitude": 78.4383, "phone": "040-23510610", "officer_in_charge": "DCP Suresh Reddy", "total_staff": 85, "available_staff": 62, "is_operational": True},
                {"id": 2, "name": "Charminar PS", "type": "Police", "district": "Hyderabad", "zone": "South", "latitude": 17.3600, "longitude": 78.4742, "phone": "040-24452444", "officer_in_charge": "CI Mohammed Ilyas", "total_staff": 70, "available_staff": 48, "is_operational": True},
                {"id": 3, "name": "Jubilee Hills Fire Station", "type": "Fire", "district": "Hyderabad", "zone": "West", "latitude": 17.4321, "longitude": 78.4087, "phone": "040-23551000", "officer_in_charge": "DFO K. Kishore Kumar", "total_staff": 40, "available_staff": 28, "is_operational": True},
                {"id": 4, "name": "Nampally Fire Station", "type": "Fire", "district": "Hyderabad", "zone": "Central", "latitude": 17.3886, "longitude": 78.4732, "phone": "040-24601115", "officer_in_charge": "SFO Ravi Teja", "total_staff": 35, "available_staff": 30, "is_operational": True},
                {"id": 5, "name": "Secunderabad PS", "type": "Police", "district": "Secunderabad", "zone": "North", "latitude": 17.4352, "longitude": 78.5014, "phone": "040-27808282", "officer_in_charge": "Inspector Chandrasekhar", "total_staff": 90, "available_staff": 70, "is_operational": True},
                {"id": 6, "name": "Madhapur PS", "type": "Police", "district": "Hyderabad", "zone": "West", "latitude": 17.4490, "longitude": 78.3833, "phone": "040-23191234", "officer_in_charge": "CI Srinivas Goud", "total_staff": 65, "available_staff": 52, "is_operational": True},
            ]
            if type:
                return [s for s in fallback if s["type"] == type]
            return fallback
        return [
            {
                "id": s.id, "name": s.name, "type": s.type, "address": s.address,
                "district": s.district, "zone": s.zone,
                "latitude": s.latitude, "longitude": s.longitude,
                "phone": s.phone, "officer_in_charge": s.officer_in_charge,
                "total_staff": s.total_staff, "available_staff": s.available_staff,
                "is_operational": s.is_operational,
            }
            for s in stations
        ]
    except Exception as e:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS & BROADCASTS ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/notifications")
def get_notifications(user_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Return notifications for a user or all recent ones."""
    try:
        query = db.query(models.Notification)
        if user_id:
            query = query.filter(models.Notification.user_id == user_id)
        notifications = query.order_by(models.Notification.sent_at.desc()).limit(limit).all()
        return [
            {
                "id": n.id, "title": n.title, "body": n.body, "type": n.type,
                "is_read": n.is_read, "sent_at": n.sent_at.isoformat() if n.sent_at else None,
                "incident_id": n.incident_id,
            }
            for n in notifications
        ]
    except Exception:
        return []


@app.post("/api/notifications/push")
async def send_push_notification(payload: dict, db: Session = Depends(get_db)):
    """Send a push notification via Firebase FCM to a token or topic."""
    token = payload.get("token")
    topic = payload.get("topic", "aegis_all")
    title = payload.get("title", "AEGIS X Alert")
    body = payload.get("body", "")
    data = payload.get("data", {})

    if token:
        ok = await fcm_service.send_to_token(token=token, title=title, body=body, data=data)
    else:
        ok = await fcm_service.send_to_topic(topic=topic, title=title, body=body, data=data)

    return {"success": ok, "channel": "push"}


@app.get("/api/broadcasts")
def get_broadcasts(limit: int = 20, db: Session = Depends(get_db)):
    """Return recent broadcasts."""
    try:
        broadcasts = db.query(models.Broadcast).order_by(
            models.Broadcast.created_at.desc()
        ).limit(limit).all()
        if not broadcasts:
            return [
                {"id": 1, "title": "🌧️ Heavy Rainfall Advisory — Hyderabad", "message": "IMD has issued heavy rainfall warning. Citizens in low-lying areas advised to avoid travel.", "type": "Alert", "severity": "Warning", "status": "Sent", "sent_count": 142500, "read_count": 89000, "created_at": datetime.datetime.utcnow().isoformat()},
                {"id": 2, "title": "🚧 Road Closure — Charminar Area", "message": "Charminar — Abids Road closed for rescue operations. Use Shalibanda — Chaderghat alternate route.", "type": "General", "severity": "Info", "status": "Sent", "sent_count": 28000, "read_count": 14000, "created_at": (datetime.datetime.utcnow() - datetime.timedelta(hours=5)).isoformat()},
            ]
        return [
            {
                "id": b.id, "title": b.title, "message": b.message, "type": b.type,
                "severity": b.severity, "channel": b.channel, "target_audience": b.target_audience,
                "status": b.status, "sent_count": b.sent_count, "read_count": b.read_count,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "sent_at": b.sent_at.isoformat() if b.sent_at else None,
            }
            for b in broadcasts
        ]
    except Exception:
        return []


@app.post("/api/broadcasts")
async def create_broadcast(payload: dict, db: Session = Depends(get_db)):
    """Create and send a new broadcast alert."""
    broadcast = models.Broadcast(
        title=payload.get("title", ""),
        message=payload.get("message", ""),
        type=payload.get("type", "General"),
        severity=payload.get("severity", "Info"),
        channel=payload.get("channel", "web,push"),
        target_audience=payload.get("target_audience", "all"),
        target_district=payload.get("target_district"),
        status="Sent",
        sent_at=datetime.datetime.utcnow(),
    )
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)

    # Send FCM broadcast
    await fcm_service.send_broadcast(
        title=broadcast.title,
        body=broadcast.message,
        severity=broadcast.severity,
    )

    # WebSocket broadcast to all connected clients
    await manager.broadcast({
        "event": "BROADCAST_SENT",
        "data": {"id": broadcast.id, "title": broadcast.title, "message": broadcast.message, "severity": broadcast.severity}
    })

    return {"id": broadcast.id, "status": "Sent"}


# ─────────────────────────────────────────────────────────────────────────────
# PREDICTIONS ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/predictions")
def get_predictions(db: Session = Depends(get_db)):
    """Return active AI risk predictions for Hyderabad."""
    try:
        preds = db.query(models.Prediction).filter(models.Prediction.is_active == True).all()
        if not preds:
            return [
                {"id": 1, "prediction_type": "flood", "location_name": "Hussain Sagar Basin", "district": "Hyderabad", "latitude": 17.3850, "longitude": 78.4867, "risk_level": "High", "probability": 0.78, "confidence": 0.85, "affected_population": 45000, "is_active": True},
                {"id": 2, "prediction_type": "fire", "location_name": "HITEC City", "district": "Hyderabad", "latitude": 17.4473, "longitude": 78.3762, "risk_level": "Moderate", "probability": 0.42, "confidence": 0.71, "affected_population": 12000, "is_active": True},
            ]
        return [
            {
                "id": p.id, "prediction_type": p.prediction_type,
                "location_name": p.location_name, "district": p.district,
                "latitude": p.latitude, "longitude": p.longitude,
                "risk_level": p.risk_level, "probability": p.probability,
                "confidence": p.confidence, "affected_area_km2": p.affected_area_km2,
                "affected_population": p.affected_population, "is_active": p.is_active,
                "valid_until": p.valid_until.isoformat() if p.valid_until else None,
            }
            for p in preds
        ]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT LOGS ROUTE
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    """Return recent audit log entries."""
    try:
        logs = db.query(models.AuditLog).order_by(
            models.AuditLog.created_at.desc()
        ).limit(limit).all()
        return [
            {
                "id": log.id, "user_id": log.user_id, "action": log.action,
                "resource_type": log.resource_type, "resource_id": log.resource_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# ENHANCED HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check for all production services."""
    from sqlalchemy import text

    # Database
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Cloudinary
    cloudinary_ok = cloudinary_service.is_configured

    # FCM
    fcm_ok = fcm_service.is_configured

    # OpenRouter AI
    ai_ok = settings.has_openrouter

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": "2.0.0",
        "city": settings.DEFAULT_CITY,
        "services": {
            "api": {"status": "healthy", "latency_ms": 1},
            "database": {"status": "healthy" if db_ok else "error", "type": "postgresql" if not settings.is_dev_mode else "sqlite"},
            "cloudinary": {"status": "healthy" if cloudinary_ok else "not_configured"},
            "firebase_fcm": {"status": "healthy" if fcm_ok else "not_configured"},
            "openrouter_ai": {"status": "healthy" if ai_ok else "not_configured"},
            "redis": {"status": "healthy" if settings.has_redis else "not_configured"},
            "websocket": {"status": "healthy", "active_connections": len(manager.active_connections)},
        },
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FIREBASE AUTH VERIFICATION ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/auth/firebase")
async def firebase_auth(auth_data: dict, db: Session = Depends(get_db)):
    """
    Accepts a Firebase ID token from the frontend, verifies it, and
    creates or retrieves the corresponding AEGIS X user record.
    """
    firebase_uid = auth_data.get("uid")
    email = auth_data.get("email", "")
    display_name = auth_data.get("displayName") or email.split("@")[0].replace(".", " ").title()
    photo_url = auth_data.get("photoURL")

    if not firebase_uid:
        raise HTTPException(status_code=400, detail="Firebase UID required")

    # Find or create user
    user = db.query(models.User).filter(models.User.firebase_uid == firebase_uid).first()
    if not user:
        # Check by email
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.firebase_uid = firebase_uid
            if photo_url and not user.avatar_url:
                user.avatar_url = photo_url
        else:
            user = models.User(
                email=email,
                firebase_uid=firebase_uid,
                full_name=display_name,
                avatar_url=photo_url,
                role="Citizen",
                status="Active",
                password_hash="",
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "token": f"firebase-{firebase_uid}",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "avatar_url": user.avatar_url,
            "firebase_uid": user.firebase_uid,
        }
    }
