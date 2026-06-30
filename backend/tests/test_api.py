import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db
from app.db import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_aegis.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed minimal mock data for testing
    db = TestingSessionLocal()
    
    # Add a user
    user = models.User(
        email="test@aegis.com",
        password_hash="$2b$12$K8M.u.0Z9Z0pGjO18a3Kq.oI8G2L4KzGvRkR.n1aUeB9p32v3n4K2",
        full_name="Test Responder",
        role="Responder",
        status="Available"
    )
    db.add(user)
    db.commit()
    
    # Add an ambulance
    ambulance = models.Resource(
        name="Ambulance A",
        type="Ambulance",
        capacity=2,
        max_capacity=2,
        latitude=40.7540,
        longitude=-73.9820,
        status="Available"
    )
    db.add(ambulance)
    db.commit()
    db.close()
    
    yield
    
    # Drop tables and remove test DB file
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_aegis.db"):
        os.remove("./test_aegis.db")

client = TestClient(app)

def test_login():
    response = client.post("/api/auth/login", json={"email": "test@aegis.com", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == "test@aegis.com"

def test_get_resources():
    response = client.get("/api/resources")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Ambulance A"

def test_create_and_get_incident():
    # Report a new incident
    incident_payload = {
        "type": "Fire",
        "severity": "High",
        "description": "Chemical fire reported in lab sector.",
        "latitude": 40.7536,
        "longitude": -73.9832,
        "location_name": "Lab Complex",
        "photo_url": ""
    }
    response = client.post("/api/incidents", json=incident_payload)
    assert response.status_code == 200
    created = response.json()
    assert created["id"] is not None
    assert created["type"] == "Fire"
    
    # The incident should trigger auto-dispatch because Ambulance A is Available
    assert created["status"] == "Dispatched"

    # Fetch incidents
    response = client.get("/api/incidents")
    assert response.status_code == 200
    incidents = response.json()
    assert len(incidents) >= 1
    assert incidents[0]["description"] == "Chemical fire reported in lab sector."

def test_simulation_endpoints():
    # Start simulation
    sim_payload = {
        "type": "fire",
        "latitude": 40.7536,
        "longitude": -73.9832,
        "parameters": {
            "windDirection": 180,
            "windSpeed": 12
        }
    }
    response = client.post("/api/simulations/start", json=sim_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "started"
    assert data["type"] == "fire"

    # Stop simulation
    response = client.post("/api/simulations/stop")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["stopping", "inactive", "stopped"]
