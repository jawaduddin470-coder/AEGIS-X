import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, AlertTriangle, CheckCircle2, X, Zap, RefreshCw,
  MapPin, Clock, Users, ChevronRight, Filter, Search,
  Shield, Activity, Info
} from 'lucide-react';
import { api } from '../utils/api';
import type { Resource, Incident } from '../utils/api';

interface ResourcesPanelProps {
  onBack: () => void;
}

const RESOURCE_ICONS: Record<string, string> = {
  'Ambulance': '🚑',
  'Fire Truck': '🚒',
  'Police Vehicle': '🚓',
  'Hospital': '🏥',
  'Shelter': '🏕️',
  'Emergency Team': '👨‍🚒',
  'Fire Station': '🚒',
  'Police Station': '🚓',
};

const STATUS_STYLES: Record<string, string> = {
  'Available': 'bg-success/15 text-success border-success/20',
  'Dispatched': 'bg-[#5DADE2]/15 text-[#5DADE2] border-[#5DADE2]/20',
  'En Route': 'bg-warning/15 text-warning border-warning/20',
  'Arrived': 'bg-purple-500/15 text-purple-600 border-purple-500/20',
  'Busy': 'bg-warning/15 text-warning border-warning/20',
  'Offline': 'bg-[#64748B]/15 text-[#64748B] border-[#64748B]/20',
  'Maintenance': 'bg-danger/15 text-danger border-danger/20',
};

type StatusFilter = 'All' | 'Available' | 'Dispatched' | 'Busy' | 'Offline';

export const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ onBack }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeSearch, setTypeSearch] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Smart Allocation Engine state
  const [allocIncidentId, setAllocIncidentId] = useState<number | null>(null);
  const [allocResult, setAllocResult] = useState<any>(null);
  const [allocLoading, setAllocLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, incs] = await Promise.all([api.fetchResources(), api.fetchIncidents()]);
      setResources(res);
      setIncidents(incs.filter((i: Incident) => i.status !== 'Resolved'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Subscribe to real-time resource updates
  useEffect(() => {
    const unsub = api.subscribe((event, data) => {
      if (event === 'RESOURCE_UPDATED') {
        setResources(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
      }
    });
    return unsub;
  }, []);

  const runAllocation = async () => {
    const incident = incidents.find(i => i.id === allocIncidentId);
    if (!incident) return;
    setAllocLoading(true);
    try {
      const result = await api.fetchAllocationRecommendation(incident.type, incident.severity);
      setAllocResult(result);
    } catch (e) { console.error(e); }
    finally { setAllocLoading(false); }
  };

  const filtered = resources.filter(r => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchType = typeSearch === '' || r.type.toLowerCase().includes(typeSearch.toLowerCase()) || r.name.toLowerCase().includes(typeSearch.toLowerCase());
    return matchStatus && matchType;
  });

  const counts = {
    total: resources.length,
    available: resources.filter(r => r.status === 'Available').length,
    dispatched: resources.filter(r => r.status === 'Dispatched' || r.status === 'Busy').length,
    offline: resources.filter(r => r.status === 'Offline').length,
  };

  const STATUS_TABS: StatusFilter[] = ['All', 'Available', 'Dispatched', 'Busy', 'Offline'];

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <X size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <Truck size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">RESOURCE MANAGEMENT</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Hyderabad Emergency Fleet</p>
          </div>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-[10px] font-bold text-[#5DADE2] hover:text-[#1E3A5F] transition-all">
          <RefreshCw size={12} />
          Sync Grid
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — Resource Grid */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: counts.total, color: 'text-[#1E3A5F]', bg: 'bg-[#1E3A5F]/10' },
                { label: 'Available', value: counts.available, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Deployed', value: counts.dispatched, color: 'text-[#5DADE2]', bg: 'bg-[#5DADE2]/10' },
                { label: 'Offline', value: counts.offline, color: 'text-danger', bg: 'bg-danger/10' },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-[#E6EEF5] rounded-xl p-3 shadow-glass-sm animate-fade-in-up">
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  value={typeSearch}
                  onChange={e => setTypeSearch(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full pl-7 pr-3 py-1.5 text-[10px] rounded-lg border border-[#E6EEF5] bg-[#F7FAFC] focus:outline-none focus:border-[#5DADE2]"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-full transition-all ${
                      statusFilter === tab
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-[#F7FAFC] border border-[#E6EEF5] text-[#64748B] hover:border-[#5DADE2]/30 hover:text-[#1E3A5F]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-[#E6EEF5] rounded-xl p-4 h-24 animate-pulse" />
                ))
              ) : filtered.map(res => (
                <div
                  key={res.id}
                  onClick={() => setSelectedResource(res === selectedResource ? null : res)}
                  className={`bg-white border rounded-xl p-4 shadow-glass-sm hover-elevation cursor-pointer transition-all ${
                    selectedResource?.id === res.id
                      ? 'border-[#5DADE2] ring-1 ring-[#5DADE2]/30'
                      : 'border-[#E6EEF5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{RESOURCE_ICONS[res.type] || '🛠️'}</span>
                      <div>
                        <div className="text-xs font-extrabold text-[#1E3A5F]">{res.name}</div>
                        <div className="text-[9px] text-[#64748B] font-medium">{res.type}</div>
                      </div>
                    </div>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${STATUS_STYLES[res.status] || STATUS_STYLES['Offline']}`}>
                      {res.status}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] text-[#64748B] mb-1">
                      <span>Capacity</span>
                      <span className="font-bold">{res.capacity} / {res.max_capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E6EEF5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5DADE2] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (res.capacity / Math.max(res.max_capacity, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5 text-[8px] text-[#64748B]">
                    <span className="flex items-center gap-0.5"><MapPin size={8}/> {res.latitude.toFixed(3)}, {res.longitude.toFixed(3)}</span>
                    {res.eta && <span className="flex items-center gap-0.5"><Clock size={8}/> ETA: {res.eta}min</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Smart Allocation Engine */}
          <div className="flex flex-col gap-4">
            {/* Allocation Engine */}
            <div className="bg-white border border-[#5DADE2]/30 rounded-xl p-5 shadow-glass-sm animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Zap size={14} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Smart Allocation</h3>
                  <p className="text-[9px] text-[#64748B]">AI-powered unit recommendation</p>
                </div>
              </div>

              <label className="block text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Select Incident</label>
              <select
                value={allocIncidentId ?? ''}
                onChange={e => { setAllocIncidentId(Number(e.target.value)); setAllocResult(null); }}
                className="w-full text-[11px] font-semibold bg-[#F7FAFC] border border-[#E6EEF5] rounded-lg py-1.5 px-2.5 text-[#1F2937] mb-3"
              >
                <option value="">— Choose active incident —</option>
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>#{inc.id} {inc.type} — {inc.severity} @ {inc.location_name.slice(0, 25)}</option>
                ))}
              </select>

              <button
                onClick={runAllocation}
                disabled={!allocIncidentId || allocLoading}
                className="w-full py-2 bg-[#1E3A5F] hover:bg-[#2C5282] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Zap size={11} />
                {allocLoading ? 'Computing...' : 'Generate Recommendation'}
              </button>

              {allocResult && (
                <div className="mt-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-widest">Response Level</div>
                      <div className={`text-sm font-black mt-0.5 ${
                        allocResult.response_level === 'IMMEDIATE' ? 'text-danger' :
                        allocResult.response_level === 'URGENT' ? 'text-warning' : 'text-success'
                      }`}>{allocResult.response_level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-widest">Est. Response</div>
                      <div className="text-sm font-black text-[#1E3A5F] mt-0.5">{allocResult.estimated_total_response_min}min</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {allocResult.recommendations.map((rec: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg border ${rec.can_fulfill ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{RESOURCE_ICONS[rec.type] || '🛠️'}</span>
                            <div>
                              <div className="text-[10px] font-extrabold text-[#1E3A5F]">{rec.type}</div>
                              <div className="text-[8px] text-[#64748B]">Priority #{rec.priority}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-[#1E3A5F]">{rec.count}</div>
                            <div className="text-[8px] text-[#64748B]">units needed</div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[8px]">
                          <span className={rec.can_fulfill ? 'text-success font-bold' : 'text-warning font-bold'}>
                            {rec.can_fulfill ? `✓ ${rec.available} available` : `⚠ Only ${rec.available} available`}
                          </span>
                          <span className="text-[#64748B]">ETA: {rec.eta_min}min</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[8px] text-[#64748B] mt-3 leading-relaxed border-t border-[#E6EEF5] pt-3">{allocResult.notes}</p>
                </div>
              )}
            </div>

            {/* Selected Resource Detail */}
            {selectedResource && (
              <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm animate-fade-in">
                <h4 className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Info size={10}/> Resource Detail
                </h4>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-2xl">{RESOURCE_ICONS[selectedResource.type] || '🛠️'}</span>
                  <div>
                    <div className="text-sm font-extrabold text-[#1E3A5F]">{selectedResource.name}</div>
                    <div className="text-[10px] text-[#64748B]">{selectedResource.type} · ID #{selectedResource.id}</div>
                  </div>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between border-b border-[#E6EEF5] pb-1.5">
                    <span className="text-[#64748B]">Status</span>
                    <span className={`font-extrabold ${selectedResource.status === 'Available' ? 'text-success' : selectedResource.status === 'Offline' ? 'text-danger' : 'text-warning'}`}>{selectedResource.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E6EEF5] pb-1.5">
                    <span className="text-[#64748B]">Capacity</span>
                    <span className="font-bold text-[#1E3A5F]">{selectedResource.capacity} / {selectedResource.max_capacity}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E6EEF5] pb-1.5">
                    <span className="text-[#64748B]">Coordinates</span>
                    <span className="font-mono font-bold text-[#1E3A5F]">{selectedResource.latitude.toFixed(4)}, {selectedResource.longitude.toFixed(4)}</span>
                  </div>
                  {selectedResource.assigned_incident_id && (
                    <div className="flex justify-between pb-1.5">
                      <span className="text-[#64748B]">Assigned Incident</span>
                      <span className="font-bold text-[#5DADE2]">#{selectedResource.assigned_incident_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
