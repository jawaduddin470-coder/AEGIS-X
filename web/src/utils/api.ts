let rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
if (rawApiBase.endsWith('/')) rawApiBase = rawApiBase.slice(0, -1);
if (!rawApiBase.endsWith('/api')) rawApiBase = `${rawApiBase}/api`;
const API_BASE = rawApiBase;

let rawWsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
if (rawWsBase.endsWith('/')) rawWsBase = rawWsBase.slice(0, -1);
if (!rawWsBase.endsWith('/ws')) rawWsBase = `${rawWsBase}/ws`;
const WS_BASE = rawWsBase;


export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'Citizen' | 'Responder' | 'Operator' | 'Administrator' | 'Super Administrator';
}

export interface Incident {
  id: number;
  type: 'Fire' | 'Flood' | 'Building Collapse' | 'Chemical Leak' | 'Earthquake' | 'Traffic Accident' | 'Stampede';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  photo_url?: string;
  video_url?: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: 'Reported' | 'Under Investigation' | 'Dispatched' | 'Active' | 'Resolved';
  reported_at: string;
  resolved_at?: string;
  citizen_id?: number;
  responder_id?: number;
  timeline?: {
    id: number;
    timestamp: string;
    event: string;
    status: string;
    created_at: string;
  }[];
}

export interface Resource {
  id: number;
  name: string;
  type: 'Ambulance' | 'Fire Truck' | 'Police Vehicle' | 'Hospital' | 'Shelter' | 'Emergency Team' | 'Fire Station' | 'Police Station';
  capacity: number;
  max_capacity: number;
  latitude: number;
  longitude: number;
  status: 'Available' | 'Dispatched' | 'Busy' | 'Offline';
  eta?: number;
  assigned_incident_id?: number;
}

export interface SimulationZone {
  type: 'Circle' | 'Polygon';
  name: string;
  center?: [number, number];
  radius?: number;
  coordinates?: [number, number][];
  style: {
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    weight: number;
    dashArray?: string;
  };
}

export interface PredictionData {
  spread_probability: number;
  affected_population: number;
  escalation_risk: 'Low' | 'Medium' | 'High' | 'Critical';
  response_time: number;
  confidence_score: number;
  recommended_resources: string[];
  // Richer fields from AEGIS prediction engine
  risk_level?: 'Low' | 'Medium' | 'High' | 'Critical';
  affected_radius_km?: number;
  resource_units_needed?: number;
  confidence?: number;
  recommended_actions?: string[];
}

export interface SimulationTick {
  tick: number;
  max_ticks: number;
  type: string;
  center: [number, number];
  intensity: number;
  radius?: number;
  zones: SimulationZone[];
  predictions?: PredictionData;
}

class ApiService {
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: string, data: any) => void> = new Set();
  private reconnectInterval: any = null;

  async request(path: string, options: RequestInit = {}): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    try {
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network response error' }));
        throw new Error(errorData.detail || 'API request failed');
      }
      return await response.json();
    } catch (err: any) {
      console.error(`API Error on ${path}:`, err);
      throw err;
    }
  }

  // --- Auth API ---
  async login(email: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async register(email: string, fullName: string, role: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name: fullName, role }),
    });
  }

  // --- Incident API ---
  async fetchIncidents(): Promise<Incident[]> {
    return this.request('/incidents');
  }

  async createIncident(incident: Partial<Incident>): Promise<Incident> {
    return this.request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async updateIncident(id: number, updates: Partial<Incident>): Promise<Incident> {
    return this.request(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Resource API ---
  async fetchResources(): Promise<Resource[]> {
    return this.request('/resources');
  }

  async updateResource(id: number, updates: Partial<Resource>): Promise<Resource> {
    return this.request(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Simulation API ---
  async startSimulation(type: string, latitude: number, longitude: number, parameters: any = {}): Promise<any> {
    return this.request('/simulations/start', {
      method: 'POST',
      body: JSON.stringify({ type, latitude, longitude, parameters }),
    });
  }

  async stopSimulation(): Promise<any> {
    return this.request('/simulations/stop', {
      method: 'POST',
    });
  }

  async pauseSimulation(): Promise<any> {
    return this.request('/simulations/pause', {
      method: 'POST',
    });
  }

  async resumeSimulation(): Promise<any> {
    return this.request('/simulations/resume', {
      method: 'POST',
    });
  }

  async resetSimulation(): Promise<any> {
    return this.request('/simulations/reset', {
      method: 'POST',
    });
  }

  async changeSimulationSpeed(speed: number): Promise<any> {
    return this.request('/simulations/speed', {
      method: 'POST',
      body: JSON.stringify({ speed }),
    });
  }

  async fetchPredictions(incidentId: number): Promise<PredictionData> {
    return this.request(`/predictions/${incidentId}`);
  }

  async fetchRiskScore(lat: number, lng: number): Promise<any> {
    return this.request(`/risk-score?latitude=${lat}&longitude=${lng}`);
  }

  // --- AI Copilot API ---
  async chatCopilot(prompt: string, context: string = ''): Promise<{ response: string }> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, context }),
    });
  }

  // --- Weather API ---
  async fetchWeather(lat: number, lng: number): Promise<any> {
    return this.request(`/weather?lat=${lat}&lng=${lng}`);
  }

  // --- Phase 5: Analytics API ---
  async fetchAnalyticsSummary(): Promise<any> {
    return this.request('/analytics/summary');
  }

  async fetchIncidentsByHour(): Promise<any[]> {
    return this.request('/analytics/incidents-by-hour');
  }

  async fetchIncidentTypes(): Promise<any[]> {
    return this.request('/analytics/incident-types');
  }

  async fetchResourceUtilization(): Promise<any[]> {
    return this.request('/analytics/resource-utilization');
  }

  async fetchRiskTrend(): Promise<any[]> {
    return this.request('/analytics/risk-trend');
  }

  // --- Phase 5: Evacuation Planning API ---
  async fetchEvacuationPlan(incidentId: number): Promise<any> {
    return this.request(`/evacuation/plan/${incidentId}`);
  }

  // --- Phase 5: Smart Resource Allocation API ---
  async fetchAllocationRecommendation(incidentType: string, severity: string): Promise<any> {
    return this.request(`/resources/allocation-recommendation?incident_type=${encodeURIComponent(incidentType)}&severity=${encodeURIComponent(severity)}`);
  }

  // --- Real-time WebSockets Connect & Listeners ---
  private status: 'LIVE' | 'RECONNECTING' | 'OFFLINE' = 'OFFLINE';
  private statusListeners: Set<(status: 'LIVE' | 'RECONNECTING' | 'OFFLINE') => void> = new Set();
  private pingInterval: any = null;

  private setStatus(newStatus: 'LIVE' | 'RECONNECTING' | 'OFFLINE') {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
    }
  }

  getConnectionStatus(): 'LIVE' | 'RECONNECTING' | 'OFFLINE' {
    return this.status;
  }

  subscribeStatus(callback: (status: 'LIVE' | 'RECONNECTING' | 'OFFLINE') => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  connectWebSocket() {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(WS_BASE);
      if (this.status === 'OFFLINE') {
        this.setStatus('RECONNECTING');
      }

      this.ws.onopen = () => {
        console.log('AEGIS X WebSocket Connected');
        this.setStatus('LIVE');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        // Start Heartbeat Ping every 10 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          this.sendWsMessage('PING', {});
        }, 10000);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'PONG') return; // absorb heartbeat
          this.wsListeners.forEach((listener) => listener(parsed.event, parsed.data));
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('AEGIS X WebSocket Disconnected, scheduling reconnect...');
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        this.setStatus('RECONNECTING');
        this.scheduleWsReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.setStatus('OFFLINE');
        this.ws?.close();
      };
    } catch (e) {
      this.setStatus('OFFLINE');
      this.scheduleWsReconnect();
    }
  }

  private scheduleWsReconnect() {
    if (this.reconnectInterval) return;
    this.reconnectInterval = setInterval(() => {
      console.log('Attempting WebSocket reconnect...');
      this.connectWebSocket();
    }, 4000); // retry every 4s
  }

  subscribe(callback: (event: string, data: any) => void): () => void {
    this.wsListeners.add(callback);
    this.connectWebSocket(); // Ensure connection is active

    return () => {
      this.wsListeners.delete(callback);
    };
  }

  sendWsMessage(event: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  // ── Production: Firebase Auth ────────────────────────────────────────────────
  async loginWithFirebase(uid: string, email: string, displayName?: string, photoURL?: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ uid, email, displayName, photoURL }),
    });
  }

  // ── Production: Image Upload (Cloudinary) ────────────────────────────────────
  async uploadImage(file: File, folder = 'aegis-x/incidents'): Promise<{ url: string; public_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Image upload failed');
    return response.json();
  }

  // ── Production: Hospitals ─────────────────────────────────────────────────────
  async fetchHospitals(): Promise<any[]> {
    return this.request('/hospitals');
  }

  // ── Production: Shelters ──────────────────────────────────────────────────────
  async fetchShelters(): Promise<any[]> {
    return this.request('/shelters');
  }

  async updateShelter(id: number, updates: any): Promise<any> {
    return this.request(`/shelters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ── Production: Stations (Police / Fire) ─────────────────────────────────────
  async fetchStations(type?: string): Promise<any[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request(`/stations${query}`);
  }

  // ── Production: Broadcasts ────────────────────────────────────────────────────
  async fetchBroadcasts(): Promise<any[]> {
    return this.request('/broadcasts');
  }

  async createBroadcast(payload: {
    title: string;
    message: string;
    type?: string;
    severity?: string;
    channel?: string;
    target_audience?: string;
    target_district?: string;
  }): Promise<any> {
    return this.request('/broadcasts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── Production: Predictions ───────────────────────────────────────────────────
  async fetchActivePredictions(): Promise<any[]> {
    return this.request('/predictions');
  }

  // ── Production: Push Notifications ───────────────────────────────────────────
  async sendPushNotification(payload: {
    title: string;
    body: string;
    topic?: string;
    token?: string;
    data?: Record<string, string>;
  }): Promise<any> {
    return this.request('/notifications/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchNotifications(userId?: number): Promise<any[]> {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/notifications${query}`);
  }

  // ── Production: Comprehensive Health Check ────────────────────────────────────
  async fetchSystemHealth(): Promise<any> {
    return this.request('/health');
  }

  // ── Production: Audit Logs ────────────────────────────────────────────────────
  async fetchAuditLogs(limit = 100): Promise<any[]> {
    return this.request(`/audit-logs?limit=${limit}`);
  }
}

export const api = new ApiService();
