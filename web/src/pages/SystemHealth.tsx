import React, { useState, useEffect, useRef } from 'react';
import {
  X, Activity, Server, Database, Wifi, Shield, Clock,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Cpu,
  Globe, Lock, Zap, BarChart2, HardDrive,
} from 'lucide-react';

interface SystemHealthProps {
  onBack: () => void;
}

type ServiceStatus = 'healthy' | 'degraded' | 'down';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  uptime: number;
  icon: React.ReactNode;
  description: string;
  lastChecked: string;
}

interface Metric {
  label: string;
  value: number;
  unit: string;
  max: number;
  color: string;
  icon: React.ReactNode;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  service: string;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  healthy: { label: 'HEALTHY', color: 'text-success', bg: 'bg-success/10 border-success/20', icon: <CheckCircle2 size={12} /> },
  degraded: { label: 'DEGRADED', color: 'text-warning', bg: 'bg-warning/10 border-warning/20', icon: <AlertTriangle size={12} /> },
  down: { label: 'DOWN', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: <XCircle size={12} /> },
};

const LOG_COLORS: Record<string, string> = {
  info: 'text-[#5DADE2]',
  warn: 'text-warning',
  error: 'text-danger',
  success: 'text-success',
};

const LOG_PREFIXES: Record<string, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERR!]',
  success: '[  OK]',
};

const DEMO_LOGS: LogEntry[] = [
  { id: '1', level: 'success', message: 'WebSocket server connected — 47 active clients', timestamp: '14:38:22', service: 'WS-Server' },
  { id: '2', level: 'info', message: 'Incident batch sync completed — 12 records processed', timestamp: '14:37:55', service: 'Sync' },
  { id: '3', level: 'success', message: 'AI Copilot model loaded — gemini-pro ready', timestamp: '14:37:10', service: 'AI-Engine' },
  { id: '4', level: 'warn', message: 'High memory usage detected on analytics worker (78%)', timestamp: '14:36:40', service: 'Analytics' },
  { id: '5', level: 'info', message: 'Rate limit: 1,247 requests in last 60s — within threshold', timestamp: '14:36:01', service: 'RateLimit' },
  { id: '6', level: 'success', message: 'Database health check passed — 99.8ms avg query time', timestamp: '14:35:22', service: 'Database' },
  { id: '7', level: 'info', message: 'SOS dispatch system online — geofencing active', timestamp: '14:34:50', service: 'SOS-Engine' },
  { id: '8', level: 'error', message: 'External weather API timeout (retrying in 30s)', timestamp: '14:34:01', service: 'WeatherAPI' },
  { id: '9', level: 'success', message: 'Backup completed — 2.3GB archived to S3', timestamp: '14:33:10', service: 'Backup' },
  { id: '10', level: 'info', message: 'JWT token rotation completed — 38 sessions refreshed', timestamp: '14:32:45', service: 'Auth' },
];

export const SystemHealth: React.FC<SystemHealthProps> = ({ onBack }) => {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'FastAPI Backend', status: 'healthy', latency: 48, uptime: 99.97, icon: <Server size={16} />, description: 'REST API + WebSocket server', lastChecked: 'Just now' },
    { name: 'SQLite / Supabase DB', status: 'healthy', latency: 12, uptime: 99.99, icon: <Database size={16} />, description: 'Primary data store', lastChecked: 'Just now' },
    { name: 'WebSocket Live Feed', status: 'healthy', latency: 8, uptime: 99.94, icon: <Wifi size={16} />, description: 'Real-time incident sync', lastChecked: 'Just now' },
    { name: 'AI Copilot Engine', status: 'healthy', latency: 320, uptime: 98.5, icon: <Zap size={16} />, description: 'Gemini AI integration', lastChecked: '2s ago' },
    { name: 'SOS Dispatch System', status: 'healthy', latency: 22, uptime: 99.99, icon: <Shield size={16} />, description: 'Emergency trigger + GPS', lastChecked: 'Just now' },
    { name: 'External Weather API', status: 'degraded', latency: 1200, uptime: 94.2, icon: <Globe size={16} />, description: 'IMD weather data feed', lastChecked: '30s ago' },
    { name: 'Auth Service (JWT)', status: 'healthy', latency: 15, uptime: 99.99, icon: <Lock size={16} />, description: 'Login and token validation', lastChecked: 'Just now' },
    { name: 'Analytics Worker', status: 'healthy', latency: 85, uptime: 99.8, icon: <BarChart2 size={16} />, description: 'Incident aggregation jobs', lastChecked: 'Just now' },
  ]);

  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'CPU Usage', value: 34, unit: '%', max: 100, color: '#5DADE2', icon: <Cpu size={14} /> },
    { label: 'Memory', value: 68, unit: '%', max: 100, color: '#F4A261', icon: <HardDrive size={14} /> },
    { label: 'Active Connections', value: 47, unit: '', max: 200, color: '#2E8B57', icon: <Wifi size={14} /> },
    { label: 'Requests / min', value: 1247, unit: '/min', max: 5000, color: '#1E3A5F', icon: <Activity size={14} /> },
    { label: 'Error Rate', value: 0.3, unit: '%', max: 5, color: '#E63946', icon: <AlertTriangle size={14} /> },
    { label: 'Cache Hit Rate', value: 94.2, unit: '%', max: 100, color: '#8B5CF6', icon: <Zap size={14} /> },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>(DEMO_LOGS);
  const [uptime, setUptime] = useState(99.96);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const logRef = useRef<HTMLDivElement>(null);

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const overallStatus: ServiceStatus = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy';

  // Simulate live metric updates
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => prev.map(m => {
        if (m.label === 'CPU Usage') return { ...m, value: Math.min(95, Math.max(10, m.value + (Math.random() - 0.5) * 8)) };
        if (m.label === 'Memory') return { ...m, value: Math.min(90, Math.max(40, m.value + (Math.random() - 0.5) * 4)) };
        if (m.label === 'Active Connections') return { ...m, value: Math.max(10, Math.min(150, m.value + Math.floor((Math.random() - 0.5) * 5))) };
        return m;
      }));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Simulate live log additions
  useEffect(() => {
    const templates = [
      { level: 'info' as const, service: 'API', message: `GET /api/incidents — 200 OK (${Math.floor(Math.random() * 100) + 10}ms)` },
      { level: 'success' as const, service: 'SOS-Engine', message: `Geofence alert processed for zone HYD-${Math.floor(Math.random() * 20) + 1}` },
      { level: 'info' as const, service: 'Auth', message: `Token validated for user session #${Math.floor(Math.random() * 1000) + 100}` },
      { level: 'info' as const, service: 'WS-Server', message: `Heartbeat: ${Math.floor(Math.random() * 60) + 20} clients online` },
    ];
    const timer = setInterval(() => {
      const t = templates[Math.floor(Math.random() * templates.length)];
      const now = new Date();
      const newEntry: LogEntry = {
        id: Date.now().toString(),
        level: t.level,
        message: t.message,
        timestamp: now.toTimeString().slice(0, 8),
        service: t.service,
      };
      setLogs(prev => [newEntry, ...prev.slice(0, 29)]);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setLastRefresh(new Date());
    setServices(prev => prev.map(s => ({ ...s, lastChecked: 'Just now' })));
    setRefreshing(false);
  };

  const overallCfg = STATUS_CONFIG[overallStatus];

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <X size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <Activity size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">SYSTEM HEALTH</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Live Infrastructure Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold border ${overallCfg.bg} ${overallCfg.color}`}>
            {overallCfg.icon}
            SYSTEM {overallCfg.label}
          </div>
          <span className="text-[9px] text-[#64748B]">Updated {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={handleRefresh} className={`flex items-center gap-1.5 text-[10px] font-bold text-[#5DADE2] hover:text-[#1E3A5F] transition-all ${refreshing ? 'opacity-50' : ''}`}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Uptime Banner */}
        <div className="bg-[#1E3A5F] rounded-xl p-5 flex items-center justify-between text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#5DADE2]/10 to-transparent" />
          <div>
            <div className="text-[10px] font-bold text-[#5DADE2] uppercase tracking-widest mb-1">30-Day System Uptime</div>
            <div className="text-5xl font-black tracking-tight">{uptime.toFixed(2)}<span className="text-2xl ml-1 text-[#5DADE2]">%</span></div>
            <div className="text-[10px] text-white/60 mt-1">SLA Target: 99.9% — <span className="text-success font-bold">✓ COMPLIANT</span></div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-2xl font-black">{healthyCount}/{services.length}</div>
              <div className="text-[9px] text-white/60 uppercase tracking-wider">Services Healthy</div>
            </div>
            <div className="flex gap-2">
              <span className="text-[8px] font-bold text-success bg-success/20 px-2 py-0.5 rounded">{healthyCount} HEALTHY</span>
              {degradedCount > 0 && <span className="text-[8px] font-bold text-warning bg-warning/20 px-2 py-0.5 rounded">{degradedCount} DEGRADED</span>}
              {downCount > 0 && <span className="text-[8px] font-bold text-danger bg-danger/20 px-2 py-0.5 rounded">{downCount} DOWN</span>}
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((m, i) => {
            const pct = (m.value / m.max) * 100;
            return (
              <div key={i} className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">LIVE</span>
                </div>
                <div className="text-xl font-black text-[#1E3A5F]">{typeof m.value === 'number' && m.value < 10 ? m.value.toFixed(1) : Math.round(m.value)}<span className="text-[10px] font-bold text-[#64748B]">{m.unit}</span></div>
                <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-2">{m.label}</div>
                <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: m.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Services Grid */}
        <div>
          <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider mb-3">Service Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status];
              return (
                <div key={i} className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm animate-fade-in-up">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-[#1E3A5F]/10 text-[#1E3A5F]`}>
                      {s.icon}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-[#1E3A5F] mb-0.5">{s.name}</h4>
                  <p className="text-[9px] text-[#64748B] mb-2">{s.description}</p>
                  <div className="flex items-center justify-between text-[9px] text-[#94A3B8]">
                    <span>⏱ {s.latency}ms</span>
                    <span>{s.uptime}% uptime</span>
                  </div>
                  <div className="text-[8px] text-[#94A3B8] mt-1">Checked: {s.lastChecked}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Log Stream */}
        <div className="bg-[#0F172A] rounded-xl p-4 shadow-glass">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Live System Log</span>
            </div>
            <span className="text-[8px] text-[#475569] font-mono">{logs.length} entries</span>
          </div>
          <div ref={logRef} className="font-mono text-[10px] space-y-1 max-h-48 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-[#475569] flex-shrink-0">{log.timestamp}</span>
                <span className={`flex-shrink-0 font-bold ${LOG_COLORS[log.level]}`}>{LOG_PREFIXES[log.level]}</span>
                <span className="text-[#64748B] flex-shrink-0">[{log.service}]</span>
                <span className="text-[#94A3B8]">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
