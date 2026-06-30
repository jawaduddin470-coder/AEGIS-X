import React, { useState, useEffect, useRef } from 'react';
import {
  X, Radio, Clock, Truck, MapPin, Sparkles, Cloud,
  Shield, AlertTriangle, Activity, Wifi, WifiOff
} from 'lucide-react';
import { MapComponent } from '../components/MapComponent';
import { api } from '../utils/api';
import type { Incident, Resource, SimulationTick } from '../utils/api';

interface SituationRoomProps {
  user: { full_name: string; role: string };
  onClose: () => void;
}

export const SituationRoom: React.FC<SituationRoomProps> = ({ user, onClose }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<SimulationTick | null>(null);
  const [wsStatus, setWsStatus] = useState<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('OFFLINE');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 32, wind: 14, humidity: 68 });
  const [aiTips, setAiTips] = useState<string[]>([
    '🔥 High thermal index in Madhapur IT Corridor — elevated fire risk for glass-facade structures.',
    '🌊 Hussain Sagar lake levels at 82% capacity. Pre-position flood response teams at Necklace Road.',
    '🚦 ORR southbound traffic density critical — consider emergency lane activation for response vehicles.',
    '☣️ Wind direction NNE at 14 km/h — Patancheru industrial corridor upwind of Bachupally residential zones.',
    '🏥 Apollo Hospitals Jubilee Hills at 74% capacity. Pre-alert NIMS for overflow protocol.',
  ]);
  const [aiTipIndex, setAiTipIndex] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const rotate = setInterval(() => setAiTipIndex(i => (i + 1) % aiTips.length), 6000);
    return () => clearInterval(rotate);
  }, [aiTips.length]);

  useEffect(() => {
    Promise.all([api.fetchIncidents(), api.fetchResources()]).then(([incs, res]) => {
      setIncidents(incs);
      setResources(res);
    });

    const unsubStatus = api.subscribeStatus(setWsStatus);
    const unsubEvents = api.subscribe((event, data) => {
      if (event === 'INCIDENT_CREATED') setIncidents(prev => [data, ...prev]);
      if (event === 'INCIDENT_UPDATED') setIncidents(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i));
      if (event === 'RESOURCE_UPDATED') setResources(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
      if (event === 'SIMULATION_TICK') { setActiveSimulation(data); }
      if (event === 'SIMULATION_COMPLETED') setActiveSimulation(null);
    });

    return () => { unsubStatus(); unsubEvents(); };
  }, []);

  const activeIncidents = incidents.filter(i => i.status !== 'Resolved');
  const criticalCount = activeIncidents.filter(i => i.severity === 'Critical').length;
  const dispatchedResources = resources.filter(r => r.status === 'Dispatched' || r.status === 'Busy');

  return (
    <div className="situation-room-overlay flex flex-col">
      {/* Top Header Bar */}
      <header className="h-14 bg-[#1E3A5F] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[#5DADE2]/20 flex items-center justify-center">
              <Shield size={12} className="text-[#5DADE2]" />
            </div>
            <span className="text-white font-extrabold tracking-widest text-sm">AEGIS X</span>
            <span className="text-[#5DADE2] font-extrabold tracking-widest text-sm">SITUATION ROOM</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10">
            {wsStatus === 'LIVE' ? <Wifi size={10} className="text-green-400 animate-pulse" /> : <WifiOff size={10} className="text-danger" />}
            <span className="text-[9px] font-extrabold text-white uppercase tracking-widest">{wsStatus}</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-danger/20">
              <AlertTriangle size={10} className="text-danger animate-pulse" />
              <span className="text-[9px] font-extrabold text-danger uppercase tracking-widest">{criticalCount} CRITICAL</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-[9px] text-white/60 uppercase tracking-widest">TIME</div>
            <div className="text-sm font-mono font-extrabold text-white tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/60 uppercase tracking-widest">WEATHER</div>
            <div className="text-sm font-extrabold text-[#5DADE2]">{weather.temp}°C · {weather.wind}km/h</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/60 uppercase tracking-widest">OPERATOR</div>
            <div className="text-sm font-extrabold text-white">{user.full_name.split(' ')[0]}</div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-danger/30 border border-white/20 transition-all"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      </header>

      {/* AI Ticker */}
      <div className="bg-[#D6EAF8] border-b border-[#5DADE2]/20 px-6 py-1.5 flex items-center gap-2">
        <Sparkles size={10} className="text-[#1E3A5F] flex-shrink-0" />
        <span className="text-[9px] font-bold text-[#1E3A5F] uppercase tracking-widest mr-2">AI ADVISORY</span>
        <span className="text-[10px] text-[#1E3A5F] font-medium animate-fade-in">{aiTips[aiTipIndex]}</span>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Live Incidents */}
        <div className="w-72 flex-shrink-0 border-r border-[#E6EEF5] bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E6EEF5] flex items-center gap-2">
            <Radio size={12} className="text-danger animate-pulse" />
            <h3 className="text-[10px] font-extrabold text-[#1E3A5F] uppercase tracking-wider">Live Incidents</h3>
            <span className="ml-auto text-[8px] font-extrabold bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded">{activeIncidents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeIncidents.length === 0 ? (
              <div className="text-[10px] text-[#64748B] text-center py-8">No active incidents</div>
            ) : activeIncidents.map(inc => (
              <div key={inc.id} className={`p-3 rounded-xl border ${inc.severity === 'Critical' ? 'border-danger/30 bg-danger/5' : 'border-[#E6EEF5] bg-[#F7FAFC]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-[#1E3A5F]">{inc.type}</span>
                  <span className={`text-[7px] font-extrabold px-1 py-0.5 rounded ${inc.severity === 'Critical' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>{inc.severity}</span>
                </div>
                <div className="text-[9px] text-[#64748B] flex items-center gap-0.5"><MapPin size={8}/>{inc.location_name}</div>
                <div className="text-[8px] text-[#94A3B8] mt-1">{inc.status}</div>
              </div>
            ))}
          </div>

          {/* Simulation status */}
          {activeSimulation && (
            <div className="p-3 border-t border-[#E6EEF5] bg-[#1E3A5F]/5">
              <div className="text-[9px] font-extrabold text-[#1E3A5F] uppercase tracking-widest mb-1 flex items-center gap-1">
                <Activity size={9} className="animate-pulse text-[#5DADE2]" /> Simulation Active
              </div>
              <div className="text-[8px] text-[#64748B]">{activeSimulation.type} · Tick {activeSimulation.tick}/{activeSimulation.max_ticks}</div>
              <div className="w-full h-1 bg-[#E6EEF5] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#5DADE2] rounded-full transition-all" style={{ width: `${(activeSimulation.tick / activeSimulation.max_ticks) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* CENTER — Large Map */}
        <div className="flex-1 relative">
          <MapComponent
            incidents={incidents}
            resources={resources}
            activeSimulation={activeSimulation}
            selectedIncident={null}
            onMapClick={() => {}}
          />
          {/* Map overlay — stats at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {[
              { label: 'Incidents', value: activeIncidents.length, color: 'text-danger' },
              { label: 'Deployed', value: dispatchedResources.length, color: 'text-[#5DADE2]' },
              { label: 'Available', value: resources.filter(r => r.status === 'Available').length, color: 'text-success' },
            ].map((s, i) => (
              <div key={i} className="glass-card px-4 py-2 rounded-xl text-center min-w-[80px]">
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Resources + Timeline */}
        <div className="w-72 flex-shrink-0 border-l border-[#E6EEF5] bg-white flex flex-col overflow-hidden">
          {/* Dispatched Resources */}
          <div className="p-4 border-b border-[#E6EEF5] flex items-center gap-2">
            <Truck size={12} className="text-[#5DADE2]" />
            <h3 className="text-[10px] font-extrabold text-[#1E3A5F] uppercase tracking-wider">Deployed Resources</h3>
            <span className="ml-auto text-[8px] font-extrabold bg-[#5DADE2]/10 text-[#5DADE2] border border-[#5DADE2]/20 px-1.5 py-0.5 rounded">{dispatchedResources.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {dispatchedResources.length === 0 ? (
              <div className="text-[10px] text-[#64748B] text-center py-6">No units deployed</div>
            ) : dispatchedResources.map(res => (
              <div key={res.id} className="p-3 rounded-xl border border-[#E6EEF5] bg-[#F7FAFC]">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-extrabold text-[#1E3A5F]">{res.name}</div>
                  <span className="text-[7px] font-extrabold px-1 py-0.5 rounded bg-warning/15 text-warning">{res.status}</span>
                </div>
                <div className="text-[9px] text-[#64748B] mt-0.5">{res.type}</div>
                {res.eta && <div className="text-[8px] text-[#5DADE2] font-bold mt-1 flex items-center gap-0.5"><Clock size={8}/>ETA: {res.eta}min</div>}
              </div>
            ))}
          </div>

          {/* Weather Panel */}
          <div className="p-4 border-t border-[#E6EEF5]">
            <div className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Cloud size={9} /> Hyderabad Weather
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#F7FAFC] rounded-lg p-2">
                <div className="text-sm font-black text-[#1E3A5F]">{weather.temp}°</div>
                <div className="text-[7px] text-[#64748B] font-bold">TEMP</div>
              </div>
              <div className="bg-[#F7FAFC] rounded-lg p-2">
                <div className="text-sm font-black text-[#1E3A5F]">{weather.wind}</div>
                <div className="text-[7px] text-[#64748B] font-bold">WIND</div>
              </div>
              <div className="bg-[#F7FAFC] rounded-lg p-2">
                <div className="text-sm font-black text-[#1E3A5F]">{weather.humidity}%</div>
                <div className="text-[7px] text-[#64748B] font-bold">HUMID</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
