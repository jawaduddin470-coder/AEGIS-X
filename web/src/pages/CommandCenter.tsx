import React, { useState, useEffect, useRef } from 'react';
import { MapComponent } from '../components/MapComponent';
import { Logo } from '../components/Logo';
import { SituationRoom } from './SituationRoom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ShieldAlert, Activity, Truck, LogOut, Send, 
  Settings, Play, Square, Thermometer, Wind, CloudRain,
  MapPin, Sparkles, Home, AlertTriangle, User, CheckCircle2,
  Radio, CheckCircle, Link, Clock, Bell, Cpu, Wifi,
  Pause, RotateCcw, Gauge, TrendingUp, ChevronUp, ChevronDown, Zap,
  FileText, Shield, Info, Download, Tv
} from 'lucide-react';
import type { Incident, Resource, SimulationTick, User as UserType } from '../utils/api';
import { api } from '../utils/api';
import { ToastContainer } from '../components/ToastContainer';
import type { Toast } from '../components/ToastContainer';
import { useTranslation, LANGUAGE_OPTIONS } from '../utils/i18n';

interface CommandCenterProps {
  user: UserType;
  onLogout: () => void;
  onOpenPresentation?: () => void;
}

interface ChatMessage {
  sender: 'ai' | 'operator';
  text: string;
  time: string;
}

// Ticker messages that rotate automatically
const TICKER_MESSAGES = [
  '🛡️ AEGIS X ONLINE — Digital twin city grid monitoring active. All nodes nominal.',
  '🌐 GEOSPATIAL SYNC — WebSocket hydration stream active. Sync latency: 12ms.',
  '🤖 AI COPILOT — OpenRouter intelligence engine connected. Context-aware response ready.',
  '📡 GRID STATUS — 12/12 sensor nodes operational. Zero anomalies detected.',
  '⚡ SIMULATION ENGINE — Physics models loaded. Fire, Flood, Collapse, Stampede engines on standby.',
];

export const CommandCenter: React.FC<CommandCenterProps> = ({ user, onLogout, onOpenPresentation }) => {
  const { t, lang, setLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'home' | 'emergencies' | 'report' | 'copilot' | 'profile' | 'evacuation' | 'reports'>('home');
  const [showSituationRoom, setShowSituationRoom] = useState(false);
  const [evacuationPlan, setEvacuationPlan] = useState<any>(null);
  const [evacLoading, setEvacLoading] = useState(false);
  const [reportIncidentId, setReportIncidentId] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Shared Core Operational States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [weather, setWeather] = useState({ temp: 24, wind: 12, code: 1 });
  const [tickerAlert, setTickerAlert] = useState<string | null>(
    'SYSTEM ONLINE: Monitoring digital twin city grid for anomalies...'
  );

  // Phase 3 Real-time States
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [wsStatus, setWsStatus] = useState<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('OFFLINE');
  const [notifications, setNotifications] = useState<any[]>([
    { id: '1', title: 'Grid Monitoring Active', message: 'AEGIS X core nodes stabilized and operating at 98.4% health.', time: '10 mins ago', type: 'info' },
    { id: '2', title: 'Weather Warning: High Wind', message: 'Gusts up to 15 km/h detected in Sector 4. High-rise zones alerted.', time: '25 mins ago', type: 'warning' }
  ]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    api: 'Healthy',
    db: 'Healthy',
    redis: 'Inactive',
    connections: 1,
    cpu: 18.4,
    memory: 46.2
  });

  const addToast = (title: string, message: string, type: 'info' | 'warning' | 'critical' | 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerIsCustom, setTickerIsCustom] = useState(false);
  const tickerCustomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulation parameters
  const [simType, setSimType] = useState('fire');
  const [simLat, setSimLat] = useState(17.4485);
  const [simLng, setSimLng] = useState(78.3908);
  const [windDirection, setWindDirection] = useState(180);
  const [windSpeed, setWindSpeed] = useState(15);
  const [waterRate, setWaterRate] = useState(10);
  const [crowdSize, setCrowdSize] = useState(500);
  const [activeSimulation, setActiveSimulation] = useState<SimulationTick | null>(null);
  const [simIsRunning, setSimIsRunning] = useState(false);
  const [simPaused, setSimPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  // AI Copilot States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `### 🛡️ AEGIS X Emergency Copilot Initialized\n\nWelcome back, **${user.full_name}**.\n\nI am connected to the spatial database. Select an incident in the grid to run containment simulations, calculate OSRM evacuation routes, or request resource suggestions.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Guided Stepper Reporting States
  const [reportStep, setReportStep] = useState(1);
  const [repType, setRepType] = useState<'Fire' | 'Flood' | 'Building Collapse' | 'Chemical Leak' | 'Stampede' | 'Traffic Accident'>('Fire');
  const [repLat, setRepLat] = useState('17.3850');
  const [repLng, setRepLng] = useState('78.4867');
  const [repLocation, setRepLocation] = useState('Jubilee Hills, Hyderabad');
  const [repSeverity, setRepSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [repDesc, setRepDesc] = useState('');
  const [newIncidentId, setNewIncidentId] = useState<number | null>(null);

  // Incident Feed Filter States
  const [feedFilter, setFeedFilter] = useState<'All' | 'Critical' | 'High' | 'Active'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Live clock effect
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Auto-rotating ticker
  useEffect(() => {
    if (tickerIsCustom) return;
    const rotate = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % TICKER_MESSAGES.length);
    }, 5000);
    return () => clearInterval(rotate);
  }, [tickerIsCustom]);

  // Fetch initial database items
  useEffect(() => {
    const initData = async () => {
      try {
        const incs = await api.fetchIncidents();
        const ress = await api.fetchResources();
        setIncidents(incs);
        setResources(ress);
        
        // Fetch weather
        const weatherData = await api.fetchWeather(40.7580, -73.9855);
        if (weatherData && weatherData.current_weather) {
          setWeather({
            temp: weatherData.current_weather.temperature,
            wind: weatherData.current_weather.windspeed,
            code: weatherData.current_weather.weathercode
          });
        }
      } catch (err) {
        console.error('Failed to load initial dataset', err);
      }
    };

    initData();
  }, []);

  // WebSocket Subscription & Status Synchronizer
  useEffect(() => {
    // 1. Subscribe to connection status transitions
    const unsubscribeStatus = api.subscribeStatus((status) => {
      setWsStatus(status);
      if (status === 'LIVE') {
        addToast('📡 SYSTEM ONLINE', 'AEGIS X Command Center connected to real-time grid telemetry.', 'success');
      } else if (status === 'OFFLINE') {
        addToast('⚠️ CONNECTION DROPPED', 'Failsafe offline mode activated. Attempting recovery...', 'critical');
      }
    });

    // 2. Subscribe to real-time telemetry events
    const unsubscribeEvents = api.subscribe((event, data) => {
      if (event === 'INCIDENT_CREATED') {
        setIncidents((prev) => [data, ...prev]);
        
        // Add floating Toast
        addToast(
          `🚨 CRITICAL ${data.type.toUpperCase()} OUTBREAK`,
          `New ${data.severity} incident reported at ${data.location_name}. Deployed staging units.`,
          data.severity === 'Critical' || data.severity === 'High' ? 'critical' : 'warning'
        );
        
        // Add to Notification Center drawer
        setNotifications((prev) => [
          {
            id: Math.random().toString(),
            title: `New Incident: ${data.type}`,
            message: `${data.description} (Location: ${data.location_name})`,
            time: 'Just now',
            type: data.severity === 'Critical' ? 'critical' : 'warning'
          },
          ...prev
        ]);

        // Override ticker with incident alert
        setTickerIsCustom(true);
        setTickerAlert(`🚨 CRITICAL OUTBREAK: A new ${data.type} incident reported at ${data.location_name}!`);
        if (tickerCustomTimeoutRef.current) clearTimeout(tickerCustomTimeoutRef.current);
        tickerCustomTimeoutRef.current = setTimeout(() => setTickerIsCustom(false), 8000);
        
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav').play(); } catch(e){}
      } else if (event === 'INCIDENT_UPDATED') {
        setIncidents((prev) => {
          const oldInc = prev.find(i => i.id === data.id);
          // If status transitioned to Resolved, show success toast!
          if (oldInc && oldInc.status !== 'Resolved' && data.status === 'Resolved') {
            addToast('✅ THREAT MITIGATED', `Incident #${data.id} (${data.type}) has been fully resolved.`, 'success');
            setNotifications((prevNotif) => [
              {
                id: Math.random().toString(),
                title: `Mitigated: Incident #${data.id}`,
                message: `The emergency outbreak has been successfully stabilized and resolved.`,
                time: 'Just now',
                type: 'success'
              },
              ...prevNotif
            ]);
          }
          return prev.map((inc) => (inc.id === data.id ? { ...inc, ...data } : inc));
        });

        if (selectedIncident?.id === data.id) {
          setSelectedIncident(prev => prev ? { ...prev, ...data } : null);
        }
      } else if (event === 'RESOURCE_UPDATED') {
        setResources((prev) => {
          const oldRes = prev.find(r => r.id === data.id);
          // If a resource was dispatched, show toast
          if (oldRes && oldRes.status !== 'Dispatched' && data.status === 'Dispatched') {
            addToast('🚒 RESOURCE DISPATCHED', `${data.name || `Resource #${data.id}`} is en route to crisis area.`, 'info');
          }
          return prev.map((res) => (res.id === data.id ? { ...res, ...data } : res));
        });
      } else if (event === 'SIMULATION_TICK') {
        setActiveSimulation(data);
        setSimIsRunning(true);
        setSimPaused(false);
      } else if (event === 'SIMULATION_COMPLETED') {
        setActiveSimulation(null);
        setSimIsRunning(false);
        setSimPaused(false);
        setSimSpeed(1);
        setTickerAlert(`✅ SIMULATION RESOLVED: ${data.type} disaster spread math completed.`);
        addToast('⚡ SIMULATION COMPLETE', `Physics propagation calculations for ${data.type} completed successfully.`, 'success');
      } else if (event === 'RESPONDER_LOCATION_UPDATED') {
        setResources((prev) =>
          prev.map((res) => (res.id === data.id ? { ...res, latitude: data.latitude, longitude: data.longitude } : res))
        );
      } else if (event === 'SYSTEM_HEALTH_UPDATE') {
        setSystemHealth({
          api: data.api_status,
          db: data.db_status,
          redis: data.redis_status,
          connections: data.websocket_connections,
          cpu: data.cpu_usage,
          memory: data.memory_usage
        });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeEvents();
    };
  }, [selectedIncident]);

  // Autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiLoading, activeTab]);

  // Map click handler to relocate simulation center
  const handleMapClick = (lat: number, lng: number) => {
    if (!simIsRunning) {
      setSimLat(parseFloat(lat.toFixed(5)));
      setSimLng(parseFloat(lng.toFixed(5)));
      setTickerAlert(`📍 Map Pin Selected: Coordinates set to ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Trigger Simulation API
  const handleStartSim = async () => {
    if (simIsRunning) return;
    setSimIsRunning(true);
    try {
      await api.startSimulation(simType, simLat, simLng, {
        windDirection,
        windSpeed,
        waterRate,
        crowdSize
      });
    } catch (e) {
      setSimIsRunning(false);
    }
  };

  const handleStopSim = async () => {
    try {
      await api.stopSimulation();
      setSimIsRunning(false);
      setSimPaused(false);
      setActiveSimulation(null);
    } catch (e) {}
  };

  const handlePauseSim = async () => {
    try {
      await api.pauseSimulation();
      setSimPaused(true);
      addToast('⏸ SIMULATION PAUSED', 'Physics propagation halted. Resume to continue.', 'info');
    } catch (e) {}
  };

  const handleResumeSim = async () => {
    try {
      await api.resumeSimulation();
      setSimPaused(false);
      addToast('▶ SIMULATION RESUMED', 'Physics propagation continuing...', 'info');
    } catch (e) {}
  };

  const handleResetSim = async () => {
    try {
      await api.resetSimulation();
      setActiveSimulation(null);
      setSimIsRunning(false);
      setSimPaused(false);
      setSimSpeed(1);
      addToast('↺ SIMULATION RESET', 'All simulation state cleared. Ready for new run.', 'success');
    } catch (e) {}
  };

  const handleSpeedChange = async (speed: number) => {
    const clamped = Math.min(4, Math.max(0.25, speed));
    try {
      await api.changeSimulationSpeed(clamped);
      setSimSpeed(clamped);
    } catch (e) {
      setSimSpeed(clamped);
    }
  };

  // Dispatch resource manually
  const handleDispatch = async (resourceId: number, incidentId: number) => {
    try {
      await api.updateResource(resourceId, {
        status: 'Dispatched',
        assigned_incident_id: incidentId,
        eta: Math.floor(Math.random() * 5) + 3 // 3-8 minutes
      });
      setTickerAlert(`🚒 Dispatch order issued to resource #${resourceId}.`);
    } catch (e) {}
  };

  // Send message to AI Copilot
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'operator',
        text: textToSend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    if (!customPrompt) setChatInput('');
    setAiLoading(true);

    let context = 'Active Incidents in city:\n';
    incidents.slice(0, 3).forEach((inc) => {
      context += `- ID ${inc.id}: ${inc.type} (${inc.severity}) at ${inc.location_name}. Status: ${inc.status}\n`;
    });
    if (selectedIncident) {
      context += `\nOperator has currently SELECTED incident ID ${selectedIncident.id}: ${selectedIncident.type} (${selectedIncident.severity}). Details: ${selectedIncident.description}\n`;
    }

    try {
      const reply = await api.chatCopilot(textToSend, context);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Error establishing connection with OpenRouter intelligence server. Operating in offline failsafe.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Quick Action AI Prompts
  const handleQuickAction = (type: string, incident: Incident) => {
    setSelectedIncident(incident);
    setActiveTab('copilot');
    if (type === 'analysis') {
      handleSendMessage(`Analyze the incident: Severe ${incident.type} at ${incident.location_name}. What is the primary risk?`);
    } else if (type === 'resources') {
      handleSendMessage(`Provide emergency resource allocation recommendations for the ${incident.severity} severity ${incident.type} at ${incident.location_name}.`);
    } else if (type === 'evac') {
      handleSendMessage(`Draft a public safety announcement and evacuation strategy for the citizens surrounding ${incident.location_name} due to the ${incident.type}.`);
    }
  };

  // Stepper Report Submission
  const handleReportSubmit = async () => {
    try {
      const payload = {
        type: repType,
        severity: repSeverity,
        description: repDesc,
        latitude: parseFloat(repLat),
        longitude: parseFloat(repLng),
        location_name: repLocation
      };
      const response = await api.createIncident(payload);
      setNewIncidentId(response.id);
      setReportStep(5); // completion step
      setRepDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  // Fill default coordinates helper — centered on Hyderabad
  const handleAutofillCoords = () => {
    const latOffset = (Math.random() - 0.5) * 0.04;
    const lngOffset = (Math.random() - 0.5) * 0.04;
    setRepLat((17.3850 + latOffset).toFixed(5));
    setRepLng((78.4867 + lngOffset).toFixed(5));
    const sectors = ['Jubilee Hills', 'Madhapur', 'Banjara Hills', 'Hitech City', 'Gachibowli', 'Begumpet', 'Secunderabad'];
    setRepLocation(`${sectors[Math.floor(Math.random() * sectors.length)]}, Hyderabad`);
  };

  // Trigger simulated crisis outbreak — all coordinates mapped to Hyderabad
  const handleSimulateCrisis = async (type: 'Fire' | 'Flood' | 'Traffic Accident' | 'Building Collapse' | 'Chemical Leak') => {
    let payload = {};
    if (type === 'Fire') {
      payload = {
        type: 'Fire',
        severity: 'Critical',
        description: 'Massive structural fire erupting across Madhapur IT Corridor. Multiple glass-facade towers threatened. TSECB fire units mobilised. Heavy smoke drifting towards Hitech City metro station.',
        latitude: 17.4485,
        longitude: 78.3908,
        location_name: 'Madhapur IT Corridor, Hyderabad'
      };
    } else if (type === 'Flood') {
      payload = {
        type: 'Flood',
        severity: 'High',
        description: 'Flash flooding at Hussain Sagar lake rim embankment. Water levels exceeding 1.8m above danger mark. Necklace Road submerged. Citizens in Banjara Hills vicinity advised to evacuate to high ground.',
        latitude: 17.4239,
        longitude: 78.4738,
        location_name: 'Hussain Sagar Lake Rim, Hyderabad'
      };
    } else if (type === 'Traffic Accident') {
      payload = {
        type: 'Traffic Accident',
        severity: 'Medium',
        description: 'Multi-vehicle pile-up on ORR (Outer Ring Road) at Shamshabad junction. 3 commercial vehicles and 7 cars involved. TSEMS teams dispatched. ORR southbound lanes blocked.',
        latitude: 17.2403,
        longitude: 78.4294,
        location_name: 'ORR Shamshabad Junction, Hyderabad'
      };
    } else if (type === 'Building Collapse') {
      payload = {
        type: 'Building Collapse',
        severity: 'Critical',
        description: 'Partial collapse of under-construction commercial tower at Jubilee Hills check post. Structural failure on floors 4–7. NDRF K9 units and GHMC heavy machinery deployed for debris extraction.',
        latitude: 17.4301,
        longitude: 78.4082,
        location_name: 'Jubilee Hills Check Post, Hyderabad'
      };
    } else if (type === 'Chemical Leak') {
      payload = {
        type: 'Chemical Leak',
        severity: 'Critical',
        description: 'Hazardous chlorine vapor release at Patancheru Industrial Estate. Plume drifting northeast toward Bachupally residential sectors. Shelter-in-place orders issued. TSPCB HazMat team en route.',
        latitude: 17.5301,
        longitude: 78.2601,
        location_name: 'Patancheru Industrial Estate, Hyderabad'
      };
    }
    
    try {
      addToast('⚡ SIMULATION INITIATED', `Broadcasting simulated ${type} event across Hyderabad grid...`, 'info');
      await api.createIncident(payload);
    } catch (err) {
      console.error('Failed to trigger simulation crisis', err);
      addToast('⚠️ SIMULATION ERROR', 'Could not broadcast simulation outbreak.', 'critical');
    }
  };

  // Weather icon mapping
  const getWeatherIcon = (code: number) => {
    if (code <= 1) return <Thermometer className="text-orange-400" size={18} />;
    if (code <= 3) return <Wind className="text-sky-400" size={18} />;
    return <CloudRain className="text-blue-400" size={18} />;
  };

  // Stats Counters
  const activeCount = incidents.filter(i => i.status !== 'Resolved').length;
  const criticalCount = incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const resourcesDispatched = resources.filter(r => r.status === 'Dispatched' || r.status === 'Busy').length;
  const availableResources = resources.filter(r => r.status === 'Available').length;
  const isAdminOrOperator = user.role === 'Administrator' || user.role === 'Super Administrator' || user.role === 'Operator';

  // -------------------------------------------------------------
  // TAB 1: 🏠 Home Rendering (Digital Twin Cockpit)
  // -------------------------------------------------------------
  const renderHome = () => {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Metric widgets row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex items-center justify-between shadow-glass-sm hover-elevation">
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{t('active_emergencies')}</div>
              <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">{activeCount}</div>
            </div>
            <div className="h-10 w-10 bg-danger/10 rounded-lg flex items-center justify-center text-danger">
              <ShieldAlert size={20} className={activeCount > 0 ? "animate-pulse" : ""} />
            </div>
          </div>

          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex items-center justify-between shadow-glass-sm hover-elevation">
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{t('dispatched_log')}</div>
              <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">{resourcesDispatched}</div>
            </div>
            <div className="h-10 w-10 bg-[#5DADE2]/10 rounded-lg flex items-center justify-center text-[#5DADE2]">
              <Truck size={20} />
            </div>
          </div>

          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex items-center justify-between shadow-glass-sm hover-elevation">
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{t('twin_grid_health')}</div>
              <div className="text-2xl font-extrabold text-success mt-1">98.4%</div>
            </div>
            <div className="h-10 w-10 bg-success/10 rounded-lg flex items-center justify-center text-success">
              <Activity size={20} className="animate-pulse" />
            </div>
          </div>

          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex items-center justify-between shadow-glass-sm hover-elevation">
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{t('ai_copilot_core')}</div>
              <div className="text-2xl font-extrabold text-[#5DADE2] mt-1">Ready</div>
            </div>
            <div className="h-10 w-10 bg-[#5DADE2]/10 rounded-lg flex items-center justify-center text-[#5DADE2]">
              <Sparkles size={20} />
            </div>
          </div>
        </div>

        {/* Home main body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map + Simulation Drawer (Left 2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="h-[480px] w-full relative">
              <MapComponent 
                incidents={incidents}
                resources={resources}
                activeSimulation={activeSimulation}
                onMapClick={handleMapClick}
                selectedIncident={selectedIncident}
              />
              
              {selectedIncident && (
                <div className="absolute top-4 right-4 glass-card p-4 rounded-xl border border-[#E6EEF5] max-w-xs shadow-glass-md z-10 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Focus Target</h4>
                      <h3 className="text-sm font-extrabold text-[#1E3A5F] mt-1">{selectedIncident.type}</h3>
                      <p className="text-[11px] text-[#64748B] mt-0.5">📍 {selectedIncident.location_name}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedIncident(null)}
                      className="text-[#64748B] hover:text-[#1F2937] text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-[#1F2937] mt-2 line-clamp-2 leading-relaxed">
                    {selectedIncident.description}
                  </p>
                  
                  {/* Dynamic Real-time Timeline */}
                  <div className="mt-3 pt-3 border-t border-[#E6EEF5]">
                    <h5 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-2">Live Operations Log</h5>
                    <div className="relative pl-3.5 border-l border-[#E6EEF5] space-y-2.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {selectedIncident.timeline && selectedIncident.timeline.length > 0 ? (
                        selectedIncident.timeline.map((evt: any) => {
                          let dotColor = 'bg-[#5DADE2]';
                          if (evt.status === 'Critical') dotColor = 'bg-danger';
                          if (evt.status === 'Warning') dotColor = 'bg-warning';
                          if (evt.status === 'Success') dotColor = 'bg-success';
                          
                          return (
                            <div key={evt.id} className="relative text-[10px] flex flex-col gap-0.5 animate-fade-in">
                              <div className={`absolute -left-[19.5px] top-1.5 h-2 w-2 rounded-full ${dotColor} border border-white`} />
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-[#1E3A5F] leading-tight">{evt.event}</span>
                                <span className="text-[8px] font-mono text-[#94A3B8] font-bold flex-shrink-0 mt-0.5">{evt.timestamp}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[9px] text-[#64748B] pl-1">Awaiting dispatch telemetry...</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[#E6EEF5] flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleQuickAction('analysis', selectedIncident)}
                      className="px-2 py-1 text-[9px] bg-[#D6EAF8] border border-[#5DADE2]/20 rounded text-[#1E3A5F] font-bold"
                    >
                      Assess Risk
                    </button>
                    <button 
                      onClick={() => handleQuickAction('resources', selectedIncident)}
                      className="px-2 py-1 text-[9px] bg-success/15 border border-success/20 rounded text-[#2E8B57] font-bold"
                    >
                      Deploy Units
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Simulation controls drawer */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-[#5DADE2]/10 flex items-center justify-center text-[#5DADE2]">
                  <Settings size={20} className={simIsRunning ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#1E3A5F]">Disaster Simulation Core</h3>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Center: {simLat}, {simLng}</p>
                </div>
              </div>

              <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div>
                  <label className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Disaster Type</label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    disabled={simIsRunning}
                    className="w-full text-xs font-semibold bg-white border border-[#E6EEF5] rounded py-1 px-2 text-[#1F2937]"
                  >
                    <option value="fire">Fire Propagation</option>
                    <option value="flood">Inundation Flow</option>
                    <option value="building collapse">Structural Collapse</option>
                    <option value="stampede">Stampede Panic</option>
                  </select>
                </div>

                {simType === 'fire' || simType === 'building collapse' ? (
                  <>
                    <div>
                      <label className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Wind Angle ({windDirection}°)</label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={windDirection}
                        onChange={(e) => setWindDirection(parseInt(e.target.value))}
                        disabled={simIsRunning}
                        className="w-full accent-[#5DADE2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Wind Speed ({windSpeed} km/h)</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={windSpeed}
                        onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                        disabled={simIsRunning}
                        className="w-full accent-[#5DADE2]"
                      />
                    </div>
                  </>
                ) : simType === 'flood' ? (
                  <div>
                    <label className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Precipitation ({waterRate} mm/h)</label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={waterRate}
                      onChange={(e) => setWaterRate(parseInt(e.target.value))}
                      disabled={simIsRunning}
                      className="w-full accent-[#5DADE2]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Crowd Size ({crowdSize} People)</label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={crowdSize}
                      onChange={(e) => setCrowdSize(parseInt(e.target.value))}
                      disabled={simIsRunning}
                      className="w-full accent-[#5DADE2]"
                    />
                  </div>
                )}

                <div className="flex flex-col justify-center items-center bg-[#F7FAFC] border border-[#E6EEF5] rounded py-1">
                  <span className="text-[7px] font-bold text-[#64748B] uppercase tracking-widest">Ticks Progress</span>
                  <span className="text-xs font-black text-[#1E3A5F] mt-0.5">
                    {activeSimulation ? `${activeSimulation.tick} / ${activeSimulation.max_ticks}` : '0 / 15'}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto flex flex-col gap-2">
                {/* Primary Run/Stop control */}
                {!simIsRunning ? (
                  <button
                    onClick={handleStartSim}
                    className="w-full bg-[#1E3A5F] hover:bg-[#2C5282] text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Play size={12} fill="white" />
                    Launch Sim
                  </button>
                ) : (
                  <button
                    onClick={handleStopSim}
                    className="w-full bg-danger hover:opacity-90 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Square size={12} fill="white" />
                    Terminate
                  </button>
                )}

                {/* Pause / Resume / Reset row */}
                <div className="flex gap-1.5">
                  <button
                    disabled={!simIsRunning || simPaused}
                    onClick={handlePauseSim}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase rounded border border-[#E6EEF5] bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Pause size={9} />
                    Pause
                  </button>
                  <button
                    disabled={!simIsRunning || !simPaused}
                    onClick={handleResumeSim}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase rounded border border-[#E6EEF5] bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Play size={9} />
                    Resume
                  </button>
                  <button
                    onClick={handleResetSim}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase rounded border border-[#E6EEF5] bg-white hover:bg-[#D6EAF8] hover:border-[#5DADE2]/30 hover:text-[#1E3A5F] transition-all"
                  >
                    <RotateCcw size={9} />
                    Reset
                  </button>
                </div>

                {/* Speed control */}
                <div className="border border-[#E6EEF5] rounded-lg bg-white p-2 flex items-center gap-2">
                  <Gauge size={11} className="text-[#5DADE2] flex-shrink-0" />
                  <span className="text-[8px] font-bold text-[#64748B] uppercase flex-1">Speed</span>
                  <button
                    onClick={() => handleSpeedChange(simSpeed / 2)}
                    disabled={simSpeed <= 0.25}
                    className="h-5 w-5 flex items-center justify-center rounded border border-[#E6EEF5] hover:bg-[#F7FAFC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronDown size={10} className="text-[#1E3A5F]" />
                  </button>
                  <span className="text-[10px] font-black text-[#1E3A5F] w-6 text-center">{simSpeed}x</span>
                  <button
                    onClick={() => handleSpeedChange(simSpeed * 2)}
                    disabled={simSpeed >= 4}
                    className="h-5 w-5 flex items-center justify-center rounded border border-[#E6EEF5] hover:bg-[#F7FAFC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronUp size={10} className="text-[#1E3A5F]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Predictions & Analytics Panel — shown when simulation is running or incident selected */}
          {(activeSimulation || selectedIncident) && (
            <div className="bg-white border border-[#5DADE2]/30 rounded-xl p-4 shadow-glass-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">AI Predictions & Analytics</h3>
                  <p className="text-[9px] text-[#64748B] mt-0.5">
                    {activeSimulation ? `Live tick ${activeSimulation.tick} / ${activeSimulation.max_ticks}` : `Incident #${selectedIncident?.id} — ${selectedIncident?.severity}`}
                  </p>
                </div>
                <span className="ml-auto text-[8px] font-extrabold text-[#2E8B57] bg-success/10 px-1.5 py-0.5 rounded border border-success/20 flex items-center gap-1">
                  <Zap size={8} className="animate-pulse" />
                  AI LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Risk Level */}
                <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Risk Level</span>
                  <span className={`text-sm font-black ${
                    (activeSimulation?.predictions?.risk_level || selectedIncident?.severity) === 'Critical' ? 'text-danger' :
                    (activeSimulation?.predictions?.risk_level || selectedIncident?.severity) === 'High' ? 'text-warning' : 'text-success'
                  }`}>
                    {activeSimulation?.predictions?.risk_level || selectedIncident?.severity || 'Assessing...'}
                  </span>
                  <div className="w-full h-1 bg-[#E6EEF5] rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      (activeSimulation?.predictions?.risk_level || selectedIncident?.severity) === 'Critical' ? 'bg-danger w-full' :
                      (activeSimulation?.predictions?.risk_level || selectedIncident?.severity) === 'High' ? 'bg-warning w-3/4' : 'bg-success w-1/2'
                    }`} />
                  </div>
                </div>

                {/* Affected Area */}
                <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Affected Radius</span>
                  <span className="text-sm font-black text-[#1E3A5F]">
                    {activeSimulation?.predictions?.affected_radius_km
                      ? `${activeSimulation.predictions.affected_radius_km.toFixed(1)} km`
                      : activeSimulation?.radius ? `${activeSimulation.radius.toFixed(1)} km`
                      : '—'}
                  </span>
                  <span className="text-[9px] text-[#64748B] mt-0.5">impact zone</span>
                </div>

                {/* Estimated Resources */}
                <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Units Required</span>
                  <span className="text-sm font-black text-[#1E3A5F]">
                    {activeSimulation?.predictions?.resource_units_needed ?? (selectedIncident ? Math.max(2, Math.ceil(Math.random() * 8)) : '—')}
                  </span>
                  <span className="text-[9px] text-[#64748B] mt-0.5">response teams</span>
                </div>

                {/* Confidence */}
                <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Model Confidence</span>
                  <span className="text-sm font-black text-[#5DADE2]">
                    {activeSimulation?.predictions?.confidence
                      ? `${(activeSimulation.predictions.confidence * 100).toFixed(0)}%`
                      : '87%'}
                  </span>
                  <span className="text-[9px] text-[#64748B] mt-0.5">AEGIS AI Engine</span>
                </div>
              </div>

              {activeSimulation?.predictions?.recommended_actions && activeSimulation.predictions.recommended_actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E6EEF5]">
                  <h5 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-2">Recommended Actions</h5>
                  <div className="flex flex-wrap gap-2">
                    {activeSimulation.predictions.recommended_actions.slice(0, 4).map((action: string, idx: number) => (
                      <span key={idx} className="text-[9px] bg-[#D6EAF8] border border-[#5DADE2]/20 text-[#1E3A5F] font-semibold px-2 py-1 rounded-full">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Side Feeds (Right 1/3) */}
          <div className="flex flex-col gap-6">
            {/* Quick Incidents Feed */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex flex-col h-[300px] shadow-glass-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider flex items-center gap-1.5">
                  <Radio size={14} className="text-danger animate-pulse" />
                  {t('active_incident_log')}
                </h3>
                <span className="text-[8px] font-extrabold text-[#2E8B57] bg-success/10 px-1.5 py-0.5 rounded border border-success/20">LIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {incidents.slice(0, 5).map((inc) => (
                  <div 
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-2.5 rounded-lg border border-[#E6EEF5] bg-[#F7FAFC]/30 hover:bg-white cursor-pointer transition-all flex flex-col gap-1 ${selectedIncident?.id === inc.id ? 'ring-1 ring-[#5DADE2] border-[#5DADE2]' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-[#1E3A5F]">{inc.type}</span>
                      <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded ${inc.severity === 'Critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{inc.severity}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B] flex items-center gap-0.5">
                      <MapPin size={9} />
                      {inc.location_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Resource Tracker */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex flex-col h-[300px] shadow-glass-sm">
              <h3 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Truck size={14} className="text-[#5DADE2]" />
                {t('resource_grid_status')}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {resources.map((res) => (
                  <div 
                    key={res.id}
                    className="p-2.5 rounded-lg border border-[#E6EEF5] bg-[#F7FAFC]/30 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#1E3A5F]">{res.name}</div>
                        <div className="text-[9px] text-[#64748B] font-medium">{res.type}</div>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${res.status === 'Available' ? 'bg-success/15 text-[#2E8B57]' : 'bg-warning/15 text-[#F4A261]'}`}>
                        {res.status}
                      </span>
                    </div>
                    {selectedIncident && res.status === 'Available' && res.type !== 'Hospital' && res.type !== 'Shelter' && res.type !== 'Fire Station' && res.type !== 'Police Station' && (
                      <button
                        onClick={() => handleDispatch(res.id, selectedIncident.id)}
                        className="w-full py-1 bg-[#1E3A5F] hover:bg-[#2C5282] text-white text-[9px] font-bold uppercase rounded transition-all"
                      >
                        ⚡ Dispatch to Area
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // TAB 2: 🚨 Emergencies Feed
  // -------------------------------------------------------------
  const renderEmergencies = () => {
    const filteredIncidents = incidents.filter((inc) => {
      // 1. Tab Severity filters
      if (feedFilter === 'Critical' && inc.severity !== 'Critical') return false;
      if (feedFilter === 'High' && inc.severity !== 'High') return false;
      if (feedFilter === 'Active' && inc.status === 'Resolved') return false;
      
      // 2. Search query matches
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inc.type.toLowerCase().includes(query) ||
          inc.location_name.toLowerCase().includes(query) ||
          inc.description.toLowerCase().includes(query)
        );
      }
      return true;
    });

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Header telemetry and filter actions */}
        <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-danger/10 rounded-lg flex items-center justify-center text-danger">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1E3A5F]">Geospatial Incident Control</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Hydration stream: sync latency 12ms • {incidents.length} logs cached • {criticalCount} critical</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-center">
            <input 
              type="text" 
              placeholder="Search type, location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2] min-w-[200px]"
            />
            
            <div className="flex bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-1 gap-1">
              {(['All', 'Critical', 'High', 'Active'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFeedFilter(tab)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${
                    feedFilter === tab 
                      ? 'bg-white text-[#1E3A5F] shadow-sm' 
                      : 'text-[#64748B] hover:text-[#1E3A5F]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-density grid logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIncidents.length === 0 ? (
            <div className="col-span-full bg-white border border-[#E6EEF5] rounded-xl p-12 text-center shadow-glass-sm">
              <div className="text-3xl">✅</div>
              <h4 className="text-sm font-extrabold text-[#1E3A5F] mt-2">All Safe & Inspected</h4>
              <p className="text-xs text-[#64748B] mt-1">No active outbreaks match your active operational filters.</p>
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isCritical = inc.severity === 'Critical';
              let progressWidth = '15%';
              if (inc.status === 'Under Investigation') progressWidth = '40%';
              if (inc.status === 'Dispatched') progressWidth = '75%';
              if (inc.status === 'Active') progressWidth = '90%';
              if (inc.status === 'Resolved') progressWidth = '100%';

              // Random estimated data to increase visual density
              const popEstimate = inc.id % 2 === 0 ? '~150 residents' : '~420 residents';
              const assignedEta = inc.status === 'Dispatched' ? 'Medic-12 ETA 4m' : inc.status === 'Resolved' ? 'Completed' : 'Awaiting staging';

              return (
                <div 
                  key={inc.id}
                  className={`bg-white border rounded-xl shadow-glass-sm flex flex-col p-4 relative overflow-hidden transition-all duration-300 hover-elevation ${
                    isCritical ? 'border-danger/30 shadow-[0_0_12px_rgba(230,57,70,0.06)]' : 'border-[#E6EEF5]'
                  }`}
                >
                  {/* Glowing alert accent strip */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${isCritical ? 'bg-danger' : inc.severity === 'High' ? 'bg-warning' : 'bg-[#5DADE2]'}`} />

                  {/* Header Row */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {inc.type === 'Fire' ? '🔥' : inc.type === 'Flood' ? '🌊' : inc.type === 'Building Collapse' ? '🏢' : '⚠️'}
                      </span>
                      <div>
                        <h4 className="text-xs font-extrabold text-[#1E3A5F]">{inc.type}</h4>
                        <span className="text-[8px] text-[#64748B] font-bold">LOG ID #{inc.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {isCritical && <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />}
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        inc.severity === 'Critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                      }`}>
                        {inc.severity}
                      </span>
                    </div>
                  </div>

                  {/* High-density grid details */}
                  <div className="grid grid-cols-2 gap-2 bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg p-2.5 mt-3 text-[10px] text-[#1F2937]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Sector Location</span>
                      <span className="font-semibold text-[#1E3A5F] truncate">📍 {inc.location_name}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Impact Estimation</span>
                      <span className="font-semibold text-slate-700">{popEstimate}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Dispatch Status</span>
                      <span className={`font-semibold ${inc.status === 'Resolved' ? 'text-success' : 'text-[#F4A261]'}`}>{inc.status}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Operational ETA</span>
                      <span className="font-semibold text-[#1E3A5F]">{assignedEta}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748B] mt-3 leading-relaxed flex-grow">
                    {inc.description}
                  </p>

                  {/* Progress Indicator */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[9px] font-bold text-[#64748B] mb-1">
                      <span>Mitigation Status</span>
                      <span>{progressWidth}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E6EEF5] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${inc.status === 'Resolved' ? 'bg-success' : 'bg-[#5DADE2]'}`}
                        style={{ width: progressWidth }}
                      />
                    </div>
                  </div>

                  {/* Vector mini coordinates card */}
                  <div className="mt-3 pt-3 border-t border-[#E6EEF5] flex items-center justify-between text-[9px] text-[#64748B] font-medium">
                    <span>GRID: {inc.latitude.toFixed(4)}N, {inc.longitude.toFixed(4)}W</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickAction('analysis', inc)}
                        className="text-[#1E3A5F] hover:text-[#2C5282] font-extrabold uppercase"
                      >
                        Risk Report
                      </button>
                      <button 
                        onClick={() => handleQuickAction('evac', inc)}
                        className="text-[#5DADE2] hover:text-[#2E86C1] font-extrabold uppercase"
                      >
                        Evac Plan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // TAB 3: 📢 Guided Stepper Reporting Form
  // -------------------------------------------------------------
  const renderReport = () => {
    const stepsCount = 4;
    const progressPercent = Math.min(100, Math.round(((reportStep - 1) / (stepsCount - 1)) * 100));

    return (
      <div className="max-w-2xl mx-auto w-full bg-white border border-[#E6EEF5] rounded-2xl shadow-glass-lg p-6 md:p-8 animate-fade-in">
        
        {/* Progress header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider">
            <span>Report Outbreak Anomaly</span>
            <span>Step {reportStep} of {stepsCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-[#E6EEF5] rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-[#5DADE2] transition-all duration-300 shadow-glow-sky"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {/* Stepper bubbles indicator */}
          {reportStep <= 4 && (
            <div className="flex justify-between mt-4 relative">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#E6EEF5] z-0 -translate-y-1/2" />
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold z-10 transition-all ${
                    reportStep === step 
                      ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white' 
                      : reportStep > step 
                        ? 'bg-success border-success text-white'
                        : 'bg-white border-[#E6EEF5] text-[#64748B]'
                  }`}
                >
                  {reportStep > step ? <CheckCircle size={14} /> : step}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STEP 1: Classification */}
        {reportStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#1E3A5F]">Select Outbreak Classification</h3>
              <p className="text-xs text-[#64748B] mt-1">Specify what class of emergency you are logging onto the digital twin grid.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { type: 'Fire', label: 'Fire & Combustion', icon: '🔥', desc: 'Structural fires, brushfires, toxic explosions.' },
                { type: 'Flood', label: 'Flood & Inundation', icon: '🌊', desc: 'Water runoff, bursting mains, flash floods.' },
                { type: 'Building Collapse', label: 'Structural Collapse', icon: '🏢', desc: 'Structural ruins, concrete wreckage, gas cracks.' },
                { type: 'Chemical Leak', label: 'Hazmat Outbreak', icon: '☣️', desc: 'Biological spills, chemical leaks, gas leaks.' },
                { type: 'Stampede', label: 'Stampede / Crowd Panic', icon: '🏃', desc: 'Crowd panic, stampede, subway stampedes.' },
                { type: 'Traffic Accident', label: 'Transit Accident', icon: '🚗', desc: 'Pileups, multi-car crashes, blockage.' },
              ].map((item) => (
                <div
                  key={item.type}
                  onClick={() => { setRepType(item.type as any); setReportStep(2); }}
                  className={`p-4 border rounded-xl bg-white hover-elevation cursor-pointer flex flex-col items-start gap-2 ${
                    repType === item.type ? 'border-[#5DADE2] bg-[#D6EAF8]/20 ring-1 ring-[#5DADE2]' : 'border-[#E6EEF5]'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="text-xs font-bold text-[#1E3A5F]">{item.label}</div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Geolocation */}
        {reportStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#1E3A5F]">Pin Geospatial Location</h3>
              <p className="text-xs text-[#64748B] mt-1">Provide geographic descriptors or coordinate points for responder routing.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Sector Name</label>
                <input 
                  type="text" 
                  value={repLocation}
                  onChange={(e) => setRepLocation(e.target.value)}
                  placeholder="e.g. Bryant Park Area"
                  className="w-full text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Latitude (WGS-84)</label>
                  <input 
                    type="text" 
                    value={repLat}
                    onChange={(e) => setRepLat(e.target.value)}
                    placeholder="40.7536"
                    className="w-full text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Longitude (WGS-84)</label>
                  <input 
                    type="text" 
                    value={repLng}
                    onChange={(e) => setRepLng(e.target.value)}
                    placeholder="-73.9832"
                    className="w-full text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutofillCoords}
                className="w-full py-2 bg-[#D6EAF8] border border-[#5DADE2]/20 hover:bg-[#5DADE2]/20 text-[#1E3A5F] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <MapPin size={14} />
                Generate Current Coordinates (NYC Bounds)
              </button>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E6EEF5]">
              <button 
                onClick={() => setReportStep(1)} 
                className="px-4 py-2 border border-[#E6EEF5] text-xs font-bold text-[#64748B] rounded-lg hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => setReportStep(3)} 
                className="px-4 py-2 bg-[#1E3A5F] text-white text-xs font-bold rounded-lg hover:bg-[#2C5282] transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Details & Severity */}
        {reportStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#1E3A5F]">Outbreak Details</h3>
              <p className="text-xs text-[#64748B] mt-1">Grade the outbreak severity and describe visual details (smoke, casualties).</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-2">Severity Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Critical'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setRepSeverity(sev)}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold transition-all ${
                        repSeverity === sev 
                          ? sev === 'Critical' ? 'bg-danger text-white border-danger' :
                            sev === 'High' ? 'bg-warning text-white border-warning' : 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                          : 'bg-white border-[#E6EEF5] text-[#64748B] hover:bg-slate-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Operational Description</label>
                <textarea 
                  rows={4}
                  value={repDesc}
                  onChange={(e) => setRepDesc(e.target.value)}
                  placeholder="Include fire colors, blocked streets, chemical smell types, etc."
                  className="w-full text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2]"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E6EEF5]">
              <button 
                onClick={() => setReportStep(2)} 
                className="px-4 py-2 border border-[#E6EEF5] text-xs font-bold text-[#64748B] rounded-lg hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button 
                disabled={!repDesc.trim()}
                onClick={() => setReportStep(4)} 
                className="px-4 py-2 bg-[#1E3A5F] disabled:opacity-50 text-white text-xs font-bold rounded-lg hover:bg-[#2C5282] transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review and Connect */}
        {reportStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#1E3A5F]">Verify Operational Report</h3>
              <p className="text-xs text-[#64748B] mt-1">Establish link credentials and verify telemetry packet before broadcast.</p>
            </div>

            <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#64748B] uppercase tracking-wider text-[8px]">Outbreak Class</span>
                  <div className="font-extrabold text-[#1E3A5F]">{repType}</div>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] uppercase tracking-wider text-[8px]">Severity Level</span>
                  <div className="font-extrabold text-danger">{repSeverity}</div>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-[#64748B] uppercase tracking-wider text-[8px]">Pinned Location</span>
                  <div className="font-semibold text-slate-700">{repLocation} ({repLat}, {repLng})</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#E6EEF5]">
                  <span className="font-bold text-[#64748B] uppercase tracking-wider text-[8px]">Description Details</span>
                  <p className="text-[#64748B] mt-0.5 leading-relaxed font-mono">{repDesc}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#D6EAF8]/30 border border-[#5DADE2]/20 rounded-lg p-3 flex items-center justify-between text-xs text-[#1E3A5F]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success animate-ping" />
                <span className="font-bold">FastAPI Connection Link established</span>
              </div>
              <span className="font-mono text-[10px] text-[#64748B]">Latency: 14ms</span>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E6EEF5]">
              <button 
                onClick={() => setReportStep(3)} 
                className="px-4 py-2 border border-[#E6EEF5] text-xs font-bold text-[#64748B] rounded-lg hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleReportSubmit} 
                className="px-6 py-2 bg-danger text-white text-xs font-bold rounded-lg hover:bg-danger-light transition-all shadow-glow-red"
              >
                Broadcast Alert 🚨
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Completion Success */}
        {reportStep === 5 && (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex h-16 w-16 bg-success/15 rounded-full items-center justify-center text-success border border-success/30 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1E3A5F]">Outbreak Broadcasted Successfully</h3>
              <p className="text-xs text-[#64748B]">Incident ID #{newIncidentId} has been seeded into the digital twin database.</p>
            </div>

            <div className="bg-[#F7FAFC] border border-[#E6EEF5] rounded-xl p-4 max-w-sm mx-auto text-xs text-[#1F2937] leading-relaxed">
              Responders in sector have been alerted. Automatic route vectors are calculating. Return to Home to view live propagation.
            </div>

            <div className="pt-4 flex gap-3 justify-center">
              <button
                onClick={() => { setReportStep(1); setActiveTab('home'); }}
                className="px-5 py-2 bg-[#1E3A5F] text-white text-xs font-bold rounded-lg hover:bg-[#2C5282] transition-all"
              >
                Return to Digital Twin Map
              </button>
              <button
                onClick={() => { setReportStep(1); setActiveTab('emergencies'); }}
                className="px-5 py-2 border border-[#E6EEF5] text-xs font-bold text-[#64748B] rounded-lg hover:bg-slate-50 transition-all"
              >
                View Incident Feed
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  // -------------------------------------------------------------
  // TAB 4: 🤖 AI Copilot (Emergency Assistant)
  // -------------------------------------------------------------
  const renderCopilot = () => {
    return (
      <div className="max-w-4xl mx-auto w-full bg-white border border-[#E6EEF5] rounded-2xl shadow-glass-lg overflow-hidden flex flex-col h-[520px] animate-fade-in">
        
        {/* Tab top telemetry */}
        <div className="bg-[#F7FAFC] border-b border-[#E6EEF5] p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5DADE2] animate-pulse" />
            <span className="font-extrabold text-[#1E3A5F] uppercase tracking-wider">AI Operations Copilot</span>
          </div>
          <span className="font-mono text-[9px] text-[#64748B]">OpenRouter LLM Link: Active</span>
        </div>

        {/* Chat message space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.sender === 'operator' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
                  {msg.sender === 'operator' ? 'COMMAND OPERATOR' : 'AEGIS SYSTEM INTELLIGENCE'}
                </span>
                <span className="text-[8px] text-[#64748B]">{msg.time}</span>
              </div>

              <div
                className={`p-3 rounded-xl max-w-[85%] text-xs shadow-glass-sm leading-relaxed border ${
                  msg.sender === 'operator'
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                    : 'bg-[#F7FAFC] text-[#1F2937] border-[#E6EEF5]'
                }`}
              >
                {/* Markdown-style list blocks render helper */}
                {msg.text.split('\n\n').map((para, pi) => {
                  if (para.startsWith('###')) {
                    return <h4 key={pi} className="font-extrabold text-[#1E3A5F] text-xs mt-2 mb-1">{para.replace('###', '')}</h4>;
                  }
                  if (para.startsWith('**') || para.includes('**')) {
                    return (
                      <p key={pi} className="mb-1">
                        {para.split('**').map((chunk, ci) => ci % 2 === 1 ? <strong key={ci} className="text-[#1E3A5F] font-bold">{chunk}</strong> : chunk)}
                      </p>
                    );
                  }
                  return <p key={pi} className="mb-1">{para}</p>;
                })}
              </div>
            </div>
          ))}
          
          {aiLoading && (
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                AEGIS AI Core compiling response...
              </span>
              <div className="p-3 bg-white border border-[#E6EEF5] rounded-xl flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5DADE2] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-[#5DADE2] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-[#5DADE2] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Preset guideline prompts */}
        <div className="px-4 py-2 bg-[#F7FAFC] border-t border-[#E6EEF5] flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button 
            onClick={() => handleSendMessage('Explain hazmat chemical containment guidelines.')}
            className="px-2.5 py-1 text-[10px] bg-white border border-[#E6EEF5] rounded text-[#64748B] font-bold hover:bg-[#E6EEF5]/40 transition-all"
          >
            ☣️ Hazmat Protocol
          </button>
          <button 
            onClick={() => handleSendMessage('Suggest staging radius configurations for building collapses.')}
            className="px-2.5 py-1 text-[10px] bg-white border border-[#E6EEF5] rounded text-[#64748B] font-bold hover:bg-[#E6EEF5]/40 transition-all"
          >
            🏢 Collapse Staging
          </button>
          <button 
            onClick={() => handleSendMessage('Draft standard public announcement evacuation bulletins.')}
            className="px-2.5 py-1 text-[10px] bg-white border border-[#E6EEF5] rounded text-[#64748B] font-bold hover:bg-[#E6EEF5]/40 transition-all"
          >
            📢 Evacuation Broadcast
          </button>
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-[#E6EEF5] flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Interrogate system intelligence for mitigation recommendations..."
            className="flex-1 text-xs border border-[#E6EEF5] bg-[#F7FAFC] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#5DADE2]"
          />
          <button
            onClick={() => handleSendMessage()}
            className="p-2 bg-[#1E3A5F] hover:bg-[#2C5282] text-white rounded-lg transition-colors"
          >
            <Send size={14} />
          </button>
        </div>

      </div>
    );
  };

  // -------------------------------------------------------------
  // TAB 5: 👤 Profile Dashboard (Role-based metrics)
  // -------------------------------------------------------------
  const renderProfile = () => {
    // 1. CITIZEN DASHBOARD
    if (user.role === 'Citizen') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Main User Card (Left) */}
          <div className="md:col-span-1 bg-white border border-[#E6EEF5] rounded-xl p-6 shadow-glass-sm flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-[#5DADE2]/10 border border-[#5DADE2]/20 rounded-full flex items-center justify-center text-[#5DADE2] text-2xl font-black">
              C
            </div>
            <h3 className="text-sm font-extrabold text-[#1E3A5F] mt-3">{user.full_name}</h3>
            <span className="text-[10px] font-bold text-[#5DADE2] uppercase tracking-wider mt-1">{user.role} Authority</span>
            <div className="w-full border-t border-[#E6EEF5] my-4" />
            <div className="w-full text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Clearance ID</span>
                <span className="font-semibold text-slate-800">#CZ-88219</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Operational Mode</span>
                <span className="font-semibold text-slate-800">Public Reporting</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="mt-6 w-full py-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              Revoke Session Link
            </button>
          </div>

          {/* Citizen Dashboard widgets (Right 2/3) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Reports Logged</span>
                <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">3 logs</div>
                <p className="text-[10px] text-[#64748B] mt-1">Logged from mobile client</p>
              </div>
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Safety Rating</span>
                <div className="text-2xl font-extrabold text-success mt-1">98 / 100</div>
                <p className="text-[10px] text-[#64748B] mt-1">Sector safety factor: High</p>
              </div>
            </div>

            {/* Safety Alerts */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm">
              <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">Broadcast Alerts Received</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-[#1F2937] leading-relaxed">
                  <div className="font-bold text-[#F4A261] mb-1">📢 FLOOD EVACUATION WARNING</div>
                  drainage channels reaching max flow capacity. Pedestrians advised to avoid baseline subway corridors.
                </div>
                <div className="p-3 rounded-lg border border-danger/20 bg-danger/5 text-xs text-[#1F2937] leading-relaxed">
                  <div className="font-bold text-danger mb-1">🚨 COMBUSTION HAZARD CONTAINMENT</div>
                  Chemical fire stabilized. Hazmat responder team Jack Vance managing operations.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. RESPONDER DASHBOARD
    if (user.role === 'Responder') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Main User Card */}
          <div className="md:col-span-1 bg-white border border-[#E6EEF5] rounded-xl p-6 shadow-glass-sm flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-[#5DADE2]/10 border border-[#5DADE2]/20 rounded-full flex items-center justify-center text-[#5DADE2] text-2xl font-black">
              R
            </div>
            <h3 className="text-sm font-extrabold text-[#1E3A5F] mt-3">{user.full_name}</h3>
            <span className="text-[10px] font-bold text-danger uppercase tracking-wider mt-1">{user.role} Clear</span>
            <div className="w-full border-t border-[#E6EEF5] my-4" />
            <div className="w-full text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Clearance ID</span>
                <span className="font-semibold text-slate-800">#FDNY-V54</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Dispatch Scope</span>
                <span className="font-semibold text-slate-800">Field Operations</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="mt-6 w-full py-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              Revoke Session Link
            </button>
          </div>

          {/* Responder stats dashboard widgets */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Incidents Handled</span>
                <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">4 assignments</div>
              </div>
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Response Time</span>
                <div className="text-2xl font-extrabold text-success mt-1">4.2m avg</div>
              </div>
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Resources Managed</span>
                <div className="text-2xl font-extrabold text-[#5DADE2] mt-1">3 systems</div>
              </div>
            </div>

            {/* Responder Active Operation Map Task card */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm">
              <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">Active Dispatch Directive</h4>
              <div className="p-3 border border-[#E6EEF5] rounded-xl bg-[#F7FAFC] flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-danger">⚠️ ACTIVE TASK: Structure Fire</span>
                  <span className="text-[#64748B] font-semibold">ETA: 4 minutes remaining</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Respond to Bryant Park Office Complex with Engine-91. Hook municipal water mains. Containment simulation estimates radial plume threat at 120m.
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-[#E6EEF5]">
                  <span>Coordinates: 40.7536N, 73.9832W</span>
                  <button 
                    onClick={() => {
                      const activeFire = incidents.find(i => i.type === 'Fire');
                      if (activeFire) handleQuickAction('analysis', activeFire);
                    }}
                    className="text-[#1E3A5F] font-bold hover:underline"
                  >
                    Open AI Containment Guidelines →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. OPERATOR DASHBOARD
    if (user.role === 'Operator') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Main User Card */}
          <div className="md:col-span-1 bg-white border border-[#E6EEF5] rounded-xl p-6 shadow-glass-sm flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-[#5DADE2]/10 border border-[#5DADE2]/20 rounded-full flex items-center justify-center text-[#5DADE2] text-2xl font-black">
              O
            </div>
            <h3 className="text-sm font-extrabold text-[#1E3A5F] mt-3">{user.full_name}</h3>
            <span className="text-[10px] font-bold text-[#5DADE2] uppercase tracking-wider mt-1">{user.role} Console</span>
            <div className="w-full border-t border-[#E6EEF5] my-4" />
            <div className="w-full text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Clearance ID</span>
                <span className="font-semibold text-slate-800">#OP-99120</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Dispatch Scope</span>
                <span className="font-semibold text-slate-800">Municipal Command</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="mt-6 w-full py-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              Revoke Session Link
            </button>
          </div>

          {/* Operator dashboard widgets */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Incidents Monitored</span>
                <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">{activeCount} logs</div>
              </div>
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Simulations Executed</span>
                <div className="text-2xl font-extrabold text-success mt-1">4 simulations</div>
              </div>
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Efficacy Metrics</span>
                <div className="text-2xl font-extrabold text-[#5DADE2] mt-1">94% rating</div>
              </div>
            </div>

            {/* Operator Telemetry stats */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm space-y-3">
              <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">System Operations Audit Log</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <div className="text-[10px] text-slate-600 border-l-2 border-[#5DADE2] pl-2 py-0.5 font-mono">
                  [18:40:02] Operator initialized fire propagation simulation at coordinates 40.7536, -73.9832.
                </div>
                <div className="text-[10px] text-slate-600 border-l-2 border-[#5DADE2] pl-2 py-0.5 font-mono">
                  [18:41:22] Incident dispatch order broadcasted successfully. Medic-12 deployed.
                </div>
                <div className="text-[10px] text-slate-600 border-l-2 border-[#5DADE2] pl-2 py-0.5 font-mono">
                  [18:42:01] OpenRouter intelligence recommendations loaded in chat window scope.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 4. ADMINISTRATOR / DEFAULT DASHBOARD
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {/* Main User Card */}
        <div className="md:col-span-1 bg-white border border-[#E6EEF5] rounded-xl p-6 shadow-glass-sm flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-[#5DADE2]/10 border border-[#5DADE2]/20 rounded-full flex items-center justify-center text-[#5DADE2] text-2xl font-black">
            A
          </div>
          <h3 className="text-sm font-extrabold text-[#1E3A5F] mt-3">{user.full_name}</h3>
          <span className="text-[10px] font-bold text-[#5DADE2] uppercase tracking-wider mt-1">{user.role} Dashboard</span>
          <div className="w-full border-t border-[#E6EEF5] my-4" />
          <div className="w-full text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Clearance ID</span>
              <span className="font-semibold text-slate-800">#ADM-00100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Database Engine</span>
              <span className="font-semibold text-slate-800">SQLite (Dual Fallback)</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="mt-6 w-full py-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} />
            Revoke Session Link
          </button>
        </div>

        {/* Administrator dashboard widgets */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Active Responders</span>
              <div className="text-2xl font-extrabold text-[#1E3A5F] mt-1">{availableResources} units</div>
            </div>
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">System Health</span>
              <div className={`text-2xl font-extrabold mt-1 ${wsStatus === 'LIVE' ? 'text-success' : 'text-danger'}`}>
                {wsStatus === 'LIVE' ? '100% ONLINE' : wsStatus === 'RECONNECTING' ? 'RECONNECTING' : 'OFFLINE'}
              </div>
            </div>
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm hover-elevation text-center">
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Incidents Managed</span>
              <div className="text-2xl font-extrabold text-[#5DADE2] mt-1">{incidents.length} total</div>
            </div>
          </div>

          {/* System status details */}
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm">
            <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">System Node Telemetry</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 border border-[#E6EEF5] rounded-lg bg-[#F7FAFC] flex justify-between items-center">
                <span className="text-[#64748B] flex items-center gap-1"><Wifi size={12} /> WebSocket Grid</span>
                <span className={`font-bold flex items-center gap-1 ${
                  wsStatus === 'LIVE' ? 'text-success' : wsStatus === 'RECONNECTING' ? 'text-[#F4A261]' : 'text-danger'
                }`}>
                  {wsStatus === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />}
                  {wsStatus === 'LIVE' ? `LIVE (${systemHealth.connections} client${systemHealth.connections > 1 ? 's' : ''})` : wsStatus}
                </span>
              </div>
              <div className="p-3 border border-[#E6EEF5] rounded-lg bg-[#F7FAFC] flex justify-between items-center">
                <span className="text-[#64748B] flex items-center gap-1"><Activity size={12} /> Database Engine</span>
                <span className={`font-bold ${systemHealth.db === 'Healthy' ? 'text-success' : 'text-danger'}`}>
                  {systemHealth.db.toUpperCase()}
                </span>
              </div>
              <div className="p-3 border border-[#E6EEF5] rounded-lg bg-[#F7FAFC] flex justify-between items-center">
                <span className="text-[#64748B] flex items-center gap-1"><Cpu size={12} /> CPU Usage</span>
                <span className="font-mono font-bold text-[#1E3A5F]">{systemHealth.cpu}%</span>
              </div>
              <div className="p-3 border border-[#E6EEF5] rounded-lg bg-[#F7FAFC] flex justify-between items-center">
                <span className="text-[#64748B] flex items-center gap-1"><Activity className="text-[#5DADE2]" size={12} /> Memory Load</span>
                <span className="font-mono font-bold text-[#5DADE2]">{systemHealth.memory}%</span>
              </div>
            </div>
          </div>

          {/* Demonstration Simulation Event Generator Console */}
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Crisis Simulation Command Board</h4>
              <p className="text-[10px] text-[#64748B] mt-0.5">Simulate emergency outbreaks instantly to test active mapping, OSRM dispatch, operations timeline, and AI Copilot live data sync.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              <button
                onClick={() => handleSimulateCrisis('Fire')}
                className="p-2.5 bg-[#F7FAFC] border border-[#E6EEF5] hover:border-danger/30 hover:bg-danger/5 text-[#1E3A5F] hover:text-danger rounded-xl text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 shadow-sm"
              >
                <span className="text-lg">🔥</span>
                Simulate Fire
              </button>
              <button
                onClick={() => handleSimulateCrisis('Flood')}
                className="p-2.5 bg-[#F7FAFC] border border-[#E6EEF5] hover:border-[#5DADE2]/30 hover:bg-[#5DADE2]/5 text-[#1E3A5F] hover:text-[#5DADE2] rounded-xl text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 shadow-sm"
              >
                <span className="text-lg">🌊</span>
                Simulate Flood
              </button>
              <button
                onClick={() => handleSimulateCrisis('Traffic Accident')}
                className="p-2.5 bg-[#F7FAFC] border border-[#E6EEF5] hover:border-[#F4A261]/30 hover:bg-[#F4A261]/5 text-[#1E3A5F] hover:text-[#F4A261] rounded-xl text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 shadow-sm"
              >
                <span className="text-lg">🚗</span>
                Simulate Accident
              </button>
              <button
                onClick={() => handleSimulateCrisis('Building Collapse')}
                className="p-2.5 bg-[#F7FAFC] border border-[#E6EEF5] hover:border-danger/30 hover:bg-danger/5 text-[#1E3A5F] hover:text-danger rounded-xl text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 shadow-sm"
              >
                <span className="text-lg">🏢</span>
                Simulate Collapse
              </button>
              <button
                onClick={() => handleSimulateCrisis('Chemical Leak')}
                className="p-2.5 bg-[#F7FAFC] border border-[#E6EEF5] hover:border-purple-300 hover:bg-purple-50 text-[#1E3A5F] hover:text-purple-600 rounded-xl text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 shadow-sm col-span-2 md:col-span-1"
              >
                <span className="text-lg">☣️</span>
                Chemical Leak
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  // -------------------------------------------------------------
  // TAB 6: 🛟 Evacuation Planning Engine
  // -------------------------------------------------------------
  const renderEvacuation = () => {
    const handleSelectIncident = async (id: number) => {
      setEvacLoading(true);
      try {
        const plan = await api.fetchEvacuationPlan(id);
        setEvacuationPlan(plan);
        const inc = incidents.find(i => i.id === id);
        if (inc) setSelectedIncident(inc);
      } catch (err) {
        console.error(err);
      } finally {
        setEvacLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Planning Engine Controls */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Cpu size={14} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Evacuation Router</h3>
                  <p className="text-[9px] text-[#64748B]">Concentric Danger Zone Mitigation</p>
                </div>
              </div>

              <label className="block text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Select Target Incident</label>
              <select
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    handleSelectIncident(Number(val));
                  } else {
                    setEvacuationPlan(null);
                    setSelectedIncident(null);
                  }
                }}
                value={evacuationPlan?.incident_id ?? ''}
                className="w-full text-[11px] font-semibold bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg py-1.5 px-2.5 text-[#1F2937] mb-3"
              >
                <option value="">— Select Active Incident —</option>
                {incidents.filter(i => i.status !== 'Resolved').map(inc => (
                  <option key={inc.id} value={inc.id}>#{inc.id} {inc.type} — {inc.severity} @ {inc.location_name.slice(0, 20)}</option>
                ))}
              </select>

              {evacLoading && (
                <div className="text-center py-8 text-[11px] text-[#64748B] font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#5DADE2] animate-ping mr-2 inline-block" />
                  Generating evacuation zones & routing options...
                </div>
              )}

              {!evacLoading && !evacuationPlan && (
                <div className="text-center py-8 text-[10px] text-[#64748B] border border-dashed border-[#E6EEF5] rounded-xl text-center">
                  Choose an active incident to trigger evacuation planning engine.
                </div>
              )}

              {!evacLoading && evacuationPlan && (
                <div className="space-y-4 animate-fade-in text-[11px]">
                  <div className="p-3 bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Location</span>
                      <span className="font-bold text-[#1E3A5F]">{evacuationPlan.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Affected Population</span>
                      <span className="font-extrabold text-[#E63946]">{evacuationPlan.total_affected_population} est.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Concentric Zones</span>
                      <span className="font-bold text-[#1E3A5F]">3 Active Rings</span>
                    </div>
                  </div>

                  {/* Concentric Danger Zones details */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Mitigation Zones</h4>
                    {evacuationPlan.danger_zones.map((zone: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-[#E6EEF5] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                          <div>
                            <div className="font-extrabold text-[#1E3A5F]">{zone.name}</div>
                            <div className="text-[8px] text-[#64748B]">{zone.radius_km}km Radius</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#1E3A5F]">{zone.population} pop</div>
                          <div className="text-[8px] text-[#64748B]">{zone.buildings} buildings</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Safe Shelters details */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Designated Safe Havens</h4>
                    {evacuationPlan.shelters.length === 0 ? (
                      <div className="text-[9px] text-[#64748B]">No emergency shelters located within 15km.</div>
                    ) : evacuationPlan.shelters.map((sh: any) => (
                      <div key={sh.id} className="p-2.5 bg-white border border-[#E6EEF5] rounded-lg space-y-1">
                        <div className="flex justify-between">
                          <span className="font-extrabold text-[#1E3A5F]">🏕️ {sh.name}</span>
                          <span className="text-[8px] font-mono text-[#5DADE2] font-bold">{sh.distance_km} km away</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-[#64748B]">
                          <span>Capacity Available</span>
                          <span className="font-bold text-[#2E8B57]">{sh.available} / {sh.capacity} beds</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Map & Evacuation Routes */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="h-[380px] w-full relative">
              <MapComponent
                incidents={incidents}
                resources={resources}
                activeSimulation={activeSimulation}
                onMapClick={handleMapClick}
                selectedIncident={selectedIncident}
                dangerZones={evacuationPlan?.danger_zones}
              />
            </div>

            {/* Evacuation Routes details */}
            {evacuationPlan && (
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in">
                <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-3">AI Evacuation Corridors</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {evacuationPlan.evacuation_routes.map((rt: any) => (
                    <div key={rt.id} className="p-3 bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                          rt.type === 'Primary' ? 'bg-success/10 text-success' : 'bg-[#5DADE2]/10 text-[#5DADE2]'
                        }`}>{rt.type} Route</span>
                        <span className="text-[9px] font-bold text-[#1E3A5F]">{rt.estimated_time_min} mins</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-[#1E3A5F]">{rt.direction} Corridor</div>
                        <div className="text-[9px] text-[#64748B] mt-0.5">{rt.distance_km} km · Road: {rt.road_condition}</div>
                      </div>
                      <div className="pt-2 border-t border-[#E6EEF5] space-y-1">
                        {rt.steps.map((st: string, idx: number) => (
                          <div key={idx} className="text-[8px] text-[#64748B] flex items-start gap-1 leading-tight">
                            <span className="text-[#5DADE2] font-bold">{idx + 1}.</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // TAB 7: 📄 Report Generator Tab
  // -------------------------------------------------------------
  const renderReports = () => {
    const handleGenerateReport = async () => {
      const inc = incidents.find(i => i.id === reportIncidentId);
      if (!inc) return;
      setReportLoading(true);
      try {
        const prompt = `You are the AEGIS X Emergency AI Coordinator. Compile a formal disaster operations report for the incident:
ID: #${inc.id}
Type: ${inc.type}
Severity: ${inc.severity}
Location: ${inc.location_name}
Description: ${inc.description}
Reported At: ${inc.reported_at}
Status: ${inc.status}

Please generate structured JSON with exactly these keys:
- summary: String (one paragraph briefing on the incident and responder status)
- timeline: Array of strings (4 chronological operational milestones)
- deployment: String (summary of deployed resources)
- analysis: String (root cause analysis and lessons learned)
- recommendations: Array of strings (3 future mitigation recommendations)`;

        const res = await api.chatCopilot(prompt, "System: Return pure JSON without any markdown code block wrappers.");
        let parsed;
        try {
          const cleanText = res.response.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanText);
        } catch (e) {
          parsed = {
            summary: `Incident #${inc.id} was reported as a ${inc.severity} severity ${inc.type} at ${inc.location_name}. Emergency response units successfully pre-positioned and secured the incident boundary.`,
            timeline: [
              `[${new Date(inc.reported_at).toLocaleTimeString()}] Incident reported & localized on twin map.`,
              `[${new Date(new Date(inc.reported_at).getTime() + 5*60000).toLocaleTimeString()}] Responding units dispatched to coordinate points.`,
              `[${new Date(new Date(inc.reported_at).getTime() + 15*60000).toLocaleTimeString()}] Mitigation perimeter stabilized by emergency crews.`,
              `[${new Date(new Date(inc.reported_at).getTime() + 35*60000).toLocaleTimeString()}] AI advisory issued and situation normalized.`
            ],
            deployment: `Initial deployment of emergency units: 2 Ambulance units, 1 Fire Squad, and 1 Police patrol crew dispatched to the IT corridor grid.`,
            analysis: `Thermal dynamics indicate high-density occupancy increased propagation speed. Fast dispatch via OSRM corridors mitigated potential commercial structure loss.`,
            recommendations: [
              "Conduct periodic safety inspections on electrical lines in low-lying commercial blocks.",
              "Enable automated alerts on wind speeds above 12 km/h.",
              "Coordinate safe corridor lanes with regional traffic controllers."
            ]
          };
        }
        setGeneratedReport({
          ...parsed,
          incident: inc,
          generated_at: new Date().toLocaleString(),
          report_id: `AEGIS-${inc.id}-${Math.floor(1000 + Math.random()*9000)}`
        });
      } catch (err) {
        console.error(err);
      } finally {
        setReportLoading(false);
      }
    };

    const exportToJSON = () => {
      if (!generatedReport) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedReport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${generatedReport.report_id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    const exportToCSV = () => {
      if (!generatedReport) return;
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Field,Details\n";
      csvContent += `Report ID,${generatedReport.report_id}\n`;
      csvContent += `Incident ID,#${generatedReport.incident.id}\n`;
      csvContent += `Type,${generatedReport.incident.type}\n`;
      csvContent += `Location,${generatedReport.incident.location_name}\n`;
      csvContent += `Severity,${generatedReport.incident.severity}\n`;
      csvContent += `Summary,"${generatedReport.summary.replace(/"/g, '""')}"\n`;
      csvContent += `Deployment,"${generatedReport.deployment.replace(/"/g, '""')}"\n`;
      csvContent += `Analysis,"${generatedReport.analysis.replace(/"/g, '""')}"\n`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", encodeURI(csvContent));
      downloadAnchor.setAttribute("download", `${generatedReport.report_id}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    const exportToPDF = () => {
      const element = document.getElementById('report-pdf-target');
      if (!element) return;
      html2canvas(element, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`${generatedReport?.report_id || 'aegis-report'}.pdf`);
      });
    };

    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls side */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <FileText size={14} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Report Generator</h3>
                  <p className="text-[9px] text-[#64748B]">Incident Archive Document Compilation</p>
                </div>
              </div>

              <label className="block text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Select Incident</label>
              <select
                onChange={e => {
                  const val = e.target.value;
                  setReportIncidentId(val ? Number(val) : null);
                  setGeneratedReport(null);
                }}
                value={reportIncidentId ?? ''}
                className="w-full text-[11px] font-semibold bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg py-1.5 px-2.5 text-[#1F2937] mb-3"
              >
                <option value="">— Select Incident —</option>
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>#{inc.id} {inc.type} — {inc.status} @ {inc.location_name.slice(0, 20)}</option>
                ))}
              </select>

              <button
                onClick={handleGenerateReport}
                disabled={!reportIncidentId || reportLoading}
                className="w-full py-2 bg-[#1E3A5F] hover:bg-[#2C5282] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <FileText size={12} />
                {reportLoading ? 'Generating Report...' : 'Build AI Operations Report'}
              </button>
            </div>
          </div>

          {/* Preview side */}
          <div className="lg:col-span-2">
            {!generatedReport && !reportLoading && (
              <div className="h-[400px] bg-white border border-[#E6EEF5] rounded-xl flex items-center justify-center text-[#64748B] text-[10px] border-dashed">
                Select an incident and run builder to preview formal operations documentation.
              </div>
            )}

            {reportLoading && (
              <div className="h-[400px] bg-white border border-[#E6EEF5] rounded-xl flex flex-col items-center justify-center text-[#64748B] text-[11px] font-bold">
                <span className="h-4 w-4 rounded-full border-2 border-t-transparent border-[#5DADE2] animate-spin mb-3" />
                Interrogating AI Copilot database and parsing coordinates...
              </div>
            )}

            {generatedReport && (
              <div className="space-y-4 animate-fade-in">
                {/* Actions row */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={exportToJSON}
                    className="px-2.5 py-1.5 border border-[#E6EEF5] text-[#1E3A5F] hover:bg-[#F7FAFC] rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={10} /> JSON
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-2.5 py-1.5 border border-[#E6EEF5] text-[#1E3A5F] hover:bg-[#F7FAFC] rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={10} /> CSV
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="px-2.5 py-1.5 bg-[#1E3A5F] text-white hover:opacity-90 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={10} /> Export PDF
                  </button>
                </div>

                {/* Print Preview Target Container */}
                <div id="report-pdf-target" className="bg-white border border-[#E6EEF5] rounded-xl p-8 shadow-glass-md text-[11px] text-[#1F2937] space-y-6">
                  {/* Document Header */}
                  <div className="flex justify-between items-start border-b border-[#E6EEF5] pb-5">
                    <div>
                      <div className="flex items-center gap-1 font-black text-sm text-[#1E3A5F] tracking-widest">
                        AEGIS <span className="text-[#5DADE2]">X</span>
                      </div>
                      <div className="text-[8px] text-[#64748B] font-bold uppercase tracking-widest mt-0.5">Emergency Intelligence Platform</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-[#1E3A5F] uppercase tracking-wider">OFFICIAL INCIDENT REPORT</div>
                      <div className="font-mono text-[9px] text-[#5DADE2] font-semibold mt-0.5">{generatedReport.report_id}</div>
                    </div>
                  </div>

                  {/* Operational Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg">
                    <div>
                      <div className="text-[8px] text-[#64748B] font-bold uppercase tracking-wider">Crisis Type</div>
                      <div className="font-extrabold text-[#1E3A5F] mt-0.5">{generatedReport.incident.type}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-[#64748B] font-bold uppercase tracking-wider">Operational Location</div>
                      <div className="font-extrabold text-[#1E3A5F] mt-0.5 truncate">{generatedReport.incident.location_name}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-[#64748B] font-bold uppercase tracking-wider">Incident Severity</div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-black mt-0.5 ${
                        generatedReport.incident.severity === 'Critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                      }`}>{generatedReport.incident.severity}</span>
                    </div>
                    <div>
                      <div className="text-[8px] text-[#64748B] font-bold uppercase tracking-wider">Generated At</div>
                      <div className="font-mono text-[#64748B] mt-0.5">{generatedReport.generated_at}</div>
                    </div>
                  </div>

                  {/* Summary Block */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider border-l-2 border-[#5DADE2] pl-2">Executive Summary</h4>
                    <p className="text-[#64748B] leading-relaxed">{generatedReport.summary}</p>
                  </div>

                  {/* Deployment summary */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider border-l-2 border-[#5DADE2] pl-2">Operational Resource Deployment</h4>
                    <p className="text-[#64748B] leading-relaxed">{generatedReport.deployment}</p>
                  </div>

                  {/* Operations Log Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider border-l-2 border-[#5DADE2] pl-2">Response Operations Timeline</h4>
                    <div className="pl-4 border-l border-[#E6EEF5] space-y-2">
                      {generatedReport.timeline.map((line: string, i: number) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-[20.5px] top-1.5 h-1.5 w-1.5 bg-[#5DADE2] rounded-full" />
                          <span className="text-[#64748B] font-medium">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis Block */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider border-l-2 border-[#5DADE2] pl-2">Root Cause Analysis</h4>
                    <p className="text-[#64748B] leading-relaxed">{generatedReport.analysis}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2 border-t border-[#E6EEF5] pt-4">
                    <h4 className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-wider">Future Mitigation Policy Recommendations</h4>
                    <ol className="list-decimal pl-4 space-y-1 text-[#64748B]">
                      {generatedReport.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="leading-relaxed">{rec}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // PRIMARY CORE LAYOUT ASSEMBLY
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F7FAFC] text-[#1F2937] font-sans relative">
      
      {/* 1. Common Premium Header */}
      <header className="h-16 glass-card-header glass-card px-4 md:px-6 flex items-center justify-between z-20 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" animate={simIsRunning} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#1E3A5F] tracking-wider text-base">AEGIS</span>
              <span className="font-extrabold text-[#5DADE2] tracking-wider text-base">X</span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/20 tracking-wider">{t('command_center')}</span>
              
              {/* Pulsing connection status badge */}
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider flex items-center gap-1 border ${
                wsStatus === 'LIVE' 
                  ? 'bg-success/10 text-[#2E8B57] border-success/30' 
                  : wsStatus === 'RECONNECTING'
                    ? 'bg-warning/10 text-[#F4A261] border-warning/30'
                    : 'bg-danger/10 text-danger border-danger/30'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  wsStatus === 'LIVE' 
                    ? 'bg-success animate-pulse' 
                    : wsStatus === 'RECONNECTING'
                      ? 'bg-warning animate-ping'
                      : 'bg-danger'
                }`} />
                {wsStatus}
              </span>
            </div>
            <div className="hidden sm:block text-[10px] text-[#64748B] font-semibold tracking-widest uppercase mt-0.5">{t('predict_simulate_respond')}</div>
          </div>
        </div>

        {/* Global Operational Ticker - Animated scrolling */}
        <div className="hidden lg:flex flex-1 mx-8 h-9 bg-[#1E3A5F]/5 rounded-lg border border-[#E6EEF5] items-center px-3 overflow-hidden relative">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse mr-3 flex-shrink-0" />
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div
              key={tickerIsCustom ? `custom-${tickerAlert}` : `tick-${tickerIndex}`}
              className="text-xs font-semibold text-[#1E3A5F] tracking-wide whitespace-nowrap absolute"
              style={{ animation: 'tickerScroll 12s linear forwards' }}
            >
              {tickerIsCustom ? tickerAlert : TICKER_MESSAGES[tickerIndex]}
            </div>
          </div>
        </div>

        {/* Status Widgets */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Language Switcher */}
          <div className="lang-switcher">
            {LANGUAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLang(opt.value)}
                className={`lang-btn ${lang === opt.value ? 'active' : ''}`}
                title={opt.label}
              >
                {opt.flag} {opt.nativeLabel}
              </button>
            ))}
          </div>

          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 border-r border-[#E6EEF5] pr-3 md:pr-4">
            <Clock size={14} className="text-[#5DADE2]" />
            <div className="font-mono text-xs font-bold text-[#1E3A5F] tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {/* Weather Widget */}
          <div className="hidden sm:flex items-center gap-2 border-r border-[#E6EEF5] pr-3 md:pr-4">
            {getWeatherIcon(weather.code)}
            <div className="text-left">
              <div className="text-xs font-extrabold text-[#1E3A5F]">{weather.temp}°C</div>
              <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Wind: {weather.wind} km/h</div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {isAdminOrOperator && (
              <>
                <button
                  onClick={() => setShowSituationRoom(true)}
                  className="h-9 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase rounded-lg border border-[#5DADE2]/30 text-[#1E3A5F] hover:bg-[#5DADE2]/10 transition-all duration-300 active:scale-95 cursor-pointer"
                  title="Enter Situation Room"
                >
                  <Activity size={12} className="text-[#5DADE2] animate-pulse" />
                  Situation Room
                </button>
                {onOpenPresentation && (
                  <button
                    onClick={onOpenPresentation}
                    className="h-9 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase rounded-lg border border-[#5DADE2]/30 text-[#1E3A5F] hover:bg-[#5DADE2]/10 transition-all duration-300 active:scale-95 cursor-pointer"
                    title="Open Presentation Mode"
                  >
                    <Tv size={12} className="text-[#5DADE2]" />
                    Presentation Mode
                  </button>
                )}
              </>
            )}

            {/* Live Notification Center Trigger */}
            <button 
              onClick={() => setNotifDrawerOpen(true)}
              className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-[#E6EEF5] text-[#1E3A5F] hover:bg-[#D6EAF8]/40 hover:border-[#5DADE2]/30 transition-all duration-300 active:scale-90"
              title="Open Live Notification Drawer"
            >
              <Bell size={15} />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-danger rounded-full flex items-center justify-center text-white text-[8px] font-black border border-white animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#1E3A5F]">{user.full_name}</div>
              <div className="text-[9px] font-extrabold text-[#5DADE2] uppercase tracking-widest">{user.role}</div>
            </div>
            <button 
              onClick={onLogout}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E6EEF5] text-gray-dark hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all duration-300 active:scale-90"
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Real-time Toast Alerts Stack */}
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* 2. Main Content Wrapper (With safe-area padding helper to prevent bottom dock overlap) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 safe-area-padding flex flex-col gap-6">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'emergencies' && renderEmergencies()}
        {activeTab === 'report' && renderReport()}
        {activeTab === 'copilot' && renderCopilot()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'evacuation' && renderEvacuation()}
        {activeTab === 'reports' && renderReports()}
      </main>

      {/* 3. Responsive Minimal Footer */}
      <footer className="w-full bg-white border-t border-[#E6EEF5] py-6 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1E3A5F]">AEGIS X</span>
            <span>•</span>
            <span>Predict. Simulate. Respond.</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span>Made with ❤️ by Mohammed Meraj Uddin</span>
            <span>•</span>
            <a 
              href="https://www.linkedin.com/in/merajuddin-0751a6396/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#5DADE2] hover:text-[#1E3A5F] transition-colors flex items-center gap-0.5 font-bold"
            >
              <Link size={12} />
              LinkedIn Profile
            </a>
          </div>
        </div>
      </footer>

      {/* 4. Premium Floating Dock Navigation */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 glass-dock px-5 py-2.5 rounded-2xl flex items-center gap-1">
        {[
          { id: 'home', label: t('home'), icon: <Home size={17} /> },
          { id: 'emergencies', label: t('alerts'), icon: <ShieldAlert size={17} />, badge: criticalCount },
          { id: 'report', label: t('report'), icon: <AlertTriangle size={17} /> },
          ...(isAdminOrOperator ? [
            { id: 'evacuation', label: t('evacuation'), icon: <Cpu size={17} /> },
            { id: 'reports', label: t('reports'), icon: <FileText size={17} /> }
          ] : []),
          { id: 'copilot', label: t('copilot'), icon: <Sparkles size={17} /> },
          { id: 'profile', label: t('profile'), icon: <User size={17} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = 'badge' in tab ? tab.badge : 0;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedIncident(null);
                setReportStep(1);
              }}
              className="relative flex flex-col items-center justify-center px-3.5 py-2 cursor-pointer transition-all duration-200 active:scale-90 rounded-xl group"
              style={isActive ? { background: 'rgba(30,58,95,0.08)' } : {}}
            >
              {/* Badge */}
              {!!badge && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-danger rounded-full flex items-center justify-center z-10">
                  <span className="text-[9px] font-black text-white">{badge}</span>
                </div>
              )}

              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-1 w-4 h-0.5 bg-[#5DADE2] rounded-full" style={{ boxShadow: '0 0 6px rgba(93,173,226,0.8)' }} />
              )}
              
              <div className={`transition-all duration-200 mt-1 ${isActive ? 'text-[#1E3A5F] scale-110' : 'text-[#64748B] group-hover:text-[#1E3A5F] group-hover:scale-105'}`}>
                {tab.icon}
              </div>
              
              <span className={`text-[9px] font-bold mt-1 tracking-wide uppercase transition-all duration-200 select-none ${
                isActive ? 'text-[#1E3A5F]' : 'text-[#94A3B8]'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 5. Sliding Notification Drawer */}
      {notifDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
            onClick={() => setNotifDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-md border-l border-[#E6EEF5] shadow-glass-lg z-50 p-5 flex flex-col gap-4 animate-slide-in-right">
            <div className="flex justify-between items-center pb-3 border-b border-[#E6EEF5]">
              <h3 className="text-sm font-black text-[#1E3A5F] uppercase tracking-wider flex items-center gap-1.5">
                <Bell size={15} className="text-[#5DADE2] animate-pulse" />
                Live Notification Center
              </h3>
              <button 
                onClick={() => setNotifDrawerOpen(false)}
                className="text-[#64748B] hover:text-[#1F2937] text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-[#64748B] text-xs">No active notifications.</div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-3 border rounded-xl transition-all flex flex-col gap-1 ${
                      notif.type === 'critical'
                        ? 'bg-danger/5 border-danger/20'
                        : notif.type === 'warning'
                          ? 'bg-warning/5 border-warning/20'
                          : notif.type === 'success'
                            ? 'bg-success/5 border-success/20'
                            : 'bg-[#F7FAFC]/30 border-[#E6EEF5] hover:bg-[#F7FAFC]/70'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-[#1E3A5F] leading-tight">{notif.title}</span>
                      <span className="text-[8px] font-mono text-[#94A3B8] font-bold flex-shrink-0 mt-0.5">{notif.time}</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] leading-relaxed mt-1">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Global keyframe for ticker scroll */}
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(100%); opacity: 0; }
          5% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes toastSlideIn {
          0% { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #E6EEF5;
          border-radius: 2px;
        }
      `}</style>

      {showSituationRoom && (
        <SituationRoom 
          user={user} 
          onClose={() => setShowSituationRoom(false)} 
        />
      )}
    </div>
  );
};

export default CommandCenter;
